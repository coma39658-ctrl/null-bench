package com.ezero.connect

import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.Signature
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

/**
 * Joins the separately pinned Root key and Android enrollment approval verifier.
 * A successful result is local cryptographic verification only, never server enrollment.
 */
internal object AndroidEnrollmentApprovalGateV1 {
    data class Result(
        val rootFingerprint: String,
        val deviceFingerprint: String,
        val challengeId: String,
        val expiresAt: String
    )

    private fun decodeP1363(value: String): ByteArray {
        require(value.matches(Regex("^[A-Za-z0-9_-]+$")) && value.length % 4 != 1) { "BAD_BASE64URL" }
        val padded = value.replace('-', '+').replace('_', '/') + "=".repeat((4 - value.length % 4) % 4)
        val bytes = Base64.getDecoder().decode(padded)
        require(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes) == value && bytes.size == 64) {
            "BAD_P1363_SIGNATURE"
        }
        return bytes
    }

    private fun p1363ToDer(signature: ByteArray): ByteArray {
        require(signature.size == 64) { "BAD_P1363_SIGNATURE_SIZE" }
        fun integer(bytes: ByteArray): ByteArray {
            var start = 0
            while (start < bytes.size - 1 && bytes[start] == 0.toByte()) start++
            var value = bytes.copyOfRange(start, bytes.size)
            if ((value[0].toInt() and 0x80) != 0) value = byteArrayOf(0) + value
            return byteArrayOf(0x02, value.size.toByte()) + value
        }
        val body = integer(signature.copyOfRange(0, 32)) + integer(signature.copyOfRange(32, 64))
        return byteArrayOf(0x30, body.size.toByte()) + body
    }

    private fun verifyDeviceProof(request: AndroidEnrollmentQrEnvelopeV1.Request) {
        val spki = Base64.getUrlDecoder().decode(request.deviceSpki)
        val key = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(spki)) as? ECPublicKey
            ?: throw IllegalArgumentException("DEVICE_PUBLIC_KEY_INVALID")
        val p256 = java.security.AlgorithmParameters.getInstance("EC").apply {
            init(ECGenParameterSpec("secp256r1"))
        }.getParameterSpec(ECParameterSpec::class.java)
        require(key.params.curve == p256.curve && key.params.generator == p256.generator &&
            key.params.order == p256.order && key.params.cofactor == p256.cofactor) { "DEVICE_KEY_NOT_P256" }
        val challenge = AndroidEnrollmentProtocolV1.Challenge(
            request.challengeId, request.deviceFp, request.nonce, request.audience, request.expiresAt
        )
        val verifier = Signature.getInstance("SHA256withECDSA")
        verifier.initVerify(key)
        verifier.update(AndroidEnrollmentProtocolV1.canonicalChallenge(challenge))
        require(verifier.verify(p1363ToDer(decodeP1363(request.deviceProof)))) { "DEVICE_PROOF_INVALID" }
    }

    fun verify(
        rawPendingRequest: String,
        rawApproval: String,
        trustedRoot: AndroidRootTrustPinV1.Pin
    ): Result {
        val request = AndroidEnrollmentQrEnvelopeV1.decodeRequest(rawPendingRequest)
        val approval = AndroidEnrollmentQrEnvelopeV1.decodeApproval(rawApproval)
        verifyDeviceProof(request)
        val verified = AndroidRootApprovalVerifierV1.verify(
            request, approval, trustedRoot.spkiBase64Url, trustedRoot.fingerprint
        )
        return Result(verified.rootFingerprint, verified.deviceFingerprint, request.challengeId, request.expiresAt)
    }
}
