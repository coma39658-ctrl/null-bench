package com.ezero.connect

import java.nio.charset.StandardCharsets

/** Strict, public-only QR envelopes. This codec does not enroll or trust a device. */
internal object AndroidEnrollmentQrEnvelopeV1 {
    private const val MAX_BYTES = 4096
    private const val ORIGIN = AndroidEnrollmentProtocolV1.AUDIENCE
    private val FP = Regex("^[a-f0-9]{64}$")
    private val ID = Regex("^[A-Za-z0-9_-]{16,128}$")
    private val B64 = Regex("^[A-Za-z0-9_-]{16,700}$")

    data class Request(
        val deviceSpki: String, val deviceFp: String, val challengeId: String,
        val nonce: String, val audience: String, val expiresAt: String, val deviceProof: String
    )
    data class Approval(
        val rootFp: String, val deviceFp: String, val challengeId: String,
        val nonce: String, val audience: String, val expiresAt: String, val rootApproval: String
    )

    private fun decode64(value: String): ByteArray {
        require(B64.matches(value) && value.length % 4 != 1) { "BAD_BASE64URL" }
        val alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
        val out = java.io.ByteArrayOutputStream()
        var buffer = 0
        var bits = 0
        value.forEach { ch ->
            val digit = alphabet.indexOf(ch)
            require(digit >= 0) { "BAD_BASE64URL" }
            buffer = (buffer shl 6) or digit
            bits += 6
            if (bits >= 8) {
                bits -= 8
                out.write((buffer shr bits) and 0xff)
            }
        }
        require(bits == 0 || (buffer and ((1 shl bits) - 1)) == 0) { "NON_CANONICAL_BASE64URL" }
        val bytes = out.toByteArray()
        require(bytes.isNotEmpty()) { "BAD_BASE64URL" }
        return bytes
    }
    private fun expiry(value: String) {
        require(value.matches(Regex("^[0-9]{13}$"))) { "BAD_EXPIRY" }
        val time = value.toLong()
        val now = System.currentTimeMillis()
        require(time > now && time <= now + 90_000L) { "CHALLENGE_EXPIRED" }
    }
    private fun envelope(tag: String, fields: List<Pair<String, String>>): String {
        val result = tag + "\n" + fields.joinToString("") { (k, v) -> "$k=$v\n" }
        require(result.toByteArray(StandardCharsets.UTF_8).size <= MAX_BYTES) { "QR_TOO_LARGE" }
        return result
    }
    private fun parse(raw: String, tag: String, expected: List<String>): Map<String, String> {
        require(raw.isNotEmpty() && raw.toByteArray(StandardCharsets.UTF_8).size <= MAX_BYTES) { "QR_SIZE_INVALID" }
        require(raw.all { it.code in 0x20..0x7e || it == '\n' }) { "QR_NON_ASCII" }
        require(raw.endsWith("\n") && !raw.contains('\r')) { "QR_LINE_ENDING_INVALID" }
        val lines = raw.dropLast(1).split('\n')
        require(lines.size == expected.size + 1 && lines.first() == tag) { "QR_ENVELOPE_INVALID" }
        val values = linkedMapOf<String, String>()
        expected.forEachIndexed { index, key ->
            val line = lines[index + 1]
            require(line.startsWith("$key=") && line.count { it == '=' } == 1) { "QR_FIELD_ORDER_OR_DUPLICATE_INVALID" }
            val value = line.substring(key.length + 1)
            require(value.isNotEmpty()) { "QR_FIELD_EMPTY" }
            values[key] = value
        }
        return values
    }

    fun encodeRequest(value: Request): String {
        require(FP.matches(value.deviceFp) && ID.matches(value.challengeId) && ID.matches(value.nonce))
        require(value.audience == ORIGIN); expiry(value.expiresAt)
        require(decode64(value.deviceSpki).size in 80..160)
        require(decode64(value.deviceProof).size == 64)
        return envelope("EZERO_ANDROID_ENROLL_REQUEST_V1", listOf(
            "device_spki" to value.deviceSpki, "device_fp" to value.deviceFp,
            "challenge_id" to value.challengeId, "nonce" to value.nonce,
            "audience" to value.audience, "expires_at" to value.expiresAt,
            "device_proof" to value.deviceProof
        ))
    }
    fun decodeRequest(raw: String): Request {
        val f = parse(raw, "EZERO_ANDROID_ENROLL_REQUEST_V1", listOf("device_spki","device_fp","challenge_id","nonce","audience","expires_at","device_proof"))
        val result = Request(f.getValue("device_spki"), f.getValue("device_fp"), f.getValue("challenge_id"), f.getValue("nonce"), f.getValue("audience"), f.getValue("expires_at"), f.getValue("device_proof"))
        require(FP.matches(result.deviceFp) && ID.matches(result.challengeId) && ID.matches(result.nonce))
        require(result.audience == ORIGIN); expiry(result.expiresAt)
        require(decode64(result.deviceSpki).size in 80..160 && decode64(result.deviceProof).size == 64)
        return result
    }
    fun encodeApproval(value: Approval): String {
        require(FP.matches(value.rootFp) && FP.matches(value.deviceFp) && ID.matches(value.challengeId) && ID.matches(value.nonce))
        require(value.audience == ORIGIN); expiry(value.expiresAt)
        require(decode64(value.rootApproval).size == 64)
        return envelope("EZERO_ANDROID_ENROLL_APPROVAL_V1", listOf(
            "root_fp" to value.rootFp, "device_fp" to value.deviceFp,
            "challenge_id" to value.challengeId, "nonce" to value.nonce,
            "audience" to value.audience, "expires_at" to value.expiresAt,
            "root_approval" to value.rootApproval
        ))
    }
    fun decodeApproval(raw: String): Approval {
        val f = parse(raw, "EZERO_ANDROID_ENROLL_APPROVAL_V1", listOf("root_fp","device_fp","challenge_id","nonce","audience","expires_at","root_approval"))
        val result = Approval(f.getValue("root_fp"), f.getValue("device_fp"), f.getValue("challenge_id"), f.getValue("nonce"), f.getValue("audience"), f.getValue("expires_at"), f.getValue("root_approval"))
        require(FP.matches(result.rootFp) && FP.matches(result.deviceFp) && ID.matches(result.challengeId) && ID.matches(result.nonce))
        require(result.audience == ORIGIN); expiry(result.expiresAt)
        require(decode64(result.rootApproval).size == 64)
        return result
    }
}