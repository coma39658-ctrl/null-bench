package com.ezero.connect

import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.Signature
import java.security.interfaces.ECPublicKey
import java.security.spec.AlgorithmParameterSpec
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.X509EncodedKeySpec

/**
 * Cryptographically verifies an Android enrollment approval against a separately
 * trusted Root SPKI. A QR-provided key is never accepted as its own trust anchor.
 */
internal object AndroidRootApprovalVerifierV1 {
    data class VerifiedApproval(val rootFingerprint: String, val deviceFingerprint: String)

    private fun decodeBase64Url(value: String): ByteArray {
        require(value.matches(Regex("^[A-Za-z0-9_-]+$")) && value.length % 4 != 1) { "BAD_BASE64URL" }
        val padded = value.replace('-', '+').replace('_', '/') + "=".repeat((4 - value.length % 4) % 4)
        val decoded = java.util.Base64.getDecoder().decode(padded)
        require(java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(decoded) == value) { "NON_CANONICAL_BASE64URL" }
        return decoded
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
        val r = integer(signature.copyOfRange(0, 32))
        val s = integer(signature.copyOfRange(32, 64))
        val body = r + s
        return byteArrayOf(0x30, body.size.toByte()) + body
    }

    private fun fingerprint(spki: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(spki)
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }

    fun verify(
        request: AndroidEnrollmentQrEnvelopeV1.Request,
        approval: AndroidEnrollmentQrEnvelopeV1.Approval,
        trustedRootSpkiBase64Url: String,
        expectedRootFingerprint: String
    ): VerifiedApproval {
        require(AndroidEnrollmentQrEnvelopeV1.matchesRequest(request, approval)) { "APPROVAL_REQUEST_BINDING_MISMATCH" }
        require(expectedRootFingerprint.matches(Regex("^[a-f0-9]{64}$"))) { "TRUSTED_ROOT_FINGERPRINT_INVALID" }
        val rootSpki = decodeBase64Url(trustedRootSpkiBase64Url)
        require(rootSpki.size in 80..160 && fingerprint(rootSpki) == expectedRootFingerprint) { "TRUSTED_ROOT_FINGERPRINT_MISMATCH" }
        val rootKey = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(rootSpki)) as? ECPublicKey
            ?: throw IllegalArgumentException("TRUSTED_ROOT_KEY_INVALID")
        val p256 = java.security.AlgorithmParameters.getInstance("EC").apply {
            init(ECGenParameterSpec("secp256r1"))
        }.getParameterSpec(ECParameterSpec::class.java)
        require(rootKey.params.curve == p256.curve && rootKey.params.generator == p256.generator &&
            rootKey.params.order == p256.order && rootKey.params.cofactor == p256.cofactor) { "TRUSTED_ROOT_NOT_P256" }
        require(fingerprint(rootSpki) == approval.rootFp) { "APPROVAL_ROOT_FINGERPRINT_MISMATCH" }

        val canonical = "EZERO_ANDROID_ROOT_APPROVAL_V1\n" +
            "root_fp=${approval.rootFp}\n" +
            "device_fp=${approval.deviceFp}\n" +
            "challenge_id=${approval.challengeId}\n" +
            "nonce=${approval.nonce}\n" +
            "audience=${approval.audience}\n" +
            "expires_at=${approval.expiresAt}\n"
        val verifier = Signature.getInstance("SHA256withECDSA")
        verifier.initVerify(rootKey)
        verifier.update(canonical.toByteArray(StandardCharsets.UTF_8))
        require(verifier.verify(p1363ToDer(decodeBase64Url(approval.rootApproval)))) { "ROOT_APPROVAL_SIGNATURE_INVALID" }
        return VerifiedApproval(approval.rootFp, approval.deviceFp)
    }
}
