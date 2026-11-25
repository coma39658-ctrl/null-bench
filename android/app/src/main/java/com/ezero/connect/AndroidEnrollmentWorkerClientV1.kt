package com.ezero.connect

import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.Base64

/**
 * HTTPS client for the isolated Android enrollment Worker candidate.
 * Call only from a background thread. No private key or Root secret is transmitted.
 * The endpoint is injected and must be an exact HTTPS workers.dev origin.
 */
internal class AndroidEnrollmentWorkerClientV1(baseUrl: String) {
    private val endpoint: String

    init {
        val parsed = URL(baseUrl.trimEnd('/'))
        require(parsed.protocol == "https" && parsed.host.endsWith(".workers.dev") &&
            parsed.path.isEmpty() && parsed.query == null && parsed.ref == null &&
            parsed.userInfo == null) { "WORKER_ENDPOINT_NOT_ALLOWED" }
        endpoint = parsed.toString()
    }

    data class ChallengeResult(val challenge: AndroidEnrollmentProtocolV1.Challenge)

    fun requestChallenge(identity: AndroidEnrollmentKeyStore.PublicIdentity): ChallengeResult {
        val body = JSONObject().put("device_spki", identity.publicKeySpkiBase64Url)
        val response = post("/v1/android/enrollment/challenge", body)
        val c = response.getJSONObject("challenge")
        val challenge = AndroidEnrollmentProtocolV1.Challenge(
            c.getString("challenge_id"),
            c.getString("device_fp"),
            c.getString("nonce"),
            c.getString("audience"),
            c.getString("expires_at")
        )
        require(challenge.deviceFingerprint == identity.fingerprint) { "WORKER_DEVICE_FINGERPRINT_MISMATCH" }
        val canonical = AndroidEnrollmentProtocolV1.canonicalChallenge(challenge)
        val returned = decodeBase64Url(response.getString("device_challenge"))
        require(returned.contentEquals(canonical)) { "WORKER_CHALLENGE_BYTES_MISMATCH" }
        return ChallengeResult(challenge)
    }

    fun completeEnrollment(
        rawRequest: String,
        rawApproval: String,
        trustedRoot: AndroidRootTrustPinV1.Pin
    ): JSONObject {
        val request = AndroidEnrollmentQrEnvelopeV1.decodeRequest(rawRequest)
        val approval = AndroidEnrollmentQrEnvelopeV1.decodeApproval(rawApproval)
        require(AndroidEnrollmentQrEnvelopeV1.matchesRequest(request, approval)) { "APPROVAL_REQUEST_MISMATCH" }
        val verified = AndroidEnrollmentApprovalGateV1.verify(rawRequest, rawApproval, trustedRoot)
        val body = JSONObject()
            .put("challenge_id", request.challengeId)
            .put("root_fp", verified.rootFingerprint)
            .put("device_proof", request.deviceProof)
            .put("root_approval", approval.rootApproval)
        val response = post("/v1/android/enrollment/complete", body)
        require(response.optBoolean("ok", false) &&
            response.optString("status") == "ENROLLED" &&
            response.optString("device_fp") == verified.deviceFingerprint &&
            response.optString("root_fp") == verified.rootFingerprint) {
            "WORKER_ENROLLMENT_RESPONSE_INVALID"
        }
        return response
    }

    private fun post(path: String, body: JSONObject): JSONObject {
        val bytes = body.toString().toByteArray(Charsets.UTF_8)
        require(bytes.size <= 4096) { "WORKER_REQUEST_TOO_LARGE" }
        val connection = (URL(endpoint + path).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 5000
            readTimeout = 10000
            instanceFollowRedirects = false
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Cache-Control", "no-store")
            setFixedLengthStreamingMode(bytes.size)
        }
        try {
            connection.outputStream.use { it.write(bytes) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val output = ByteArrayOutputStream()
            stream?.use { input ->
                val buffer = ByteArray(1024)
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    require(output.size() + count <= 4096) { "WORKER_RESPONSE_TOO_LARGE" }
                    output.write(buffer, 0, count)
                }
            }
            val raw = output.toString("UTF-8")
            val parsed = try { JSONObject(raw) } catch (_: Exception) {
                throw IllegalStateException("WORKER_RESPONSE_INVALID_JSON")
            }
            require(status in 200..299) {
                "WORKER_HTTP_$status:" + parsed.optString("error", "REQUEST_FAILED")
            }
            return parsed
        } finally {
            connection.disconnect()
        }
    }

    private fun decodeBase64Url(value: String): ByteArray {
        require(value.matches(Regex("^[A-Za-z0-9_-]+$")) && value.length % 4 != 1) {
            "WORKER_CHALLENGE_ENCODING_INVALID"
        }
        val bytes = Base64.getUrlDecoder().decode(value + "=".repeat((4 - value.length % 4) % 4))
        require(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes) == value) {
            "WORKER_CHALLENGE_ENCODING_NON_CANONICAL"
        }
        return bytes
    }
}
