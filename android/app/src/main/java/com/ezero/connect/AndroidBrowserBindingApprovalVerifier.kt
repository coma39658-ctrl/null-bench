package com.ezero.connect

import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.Signature
import java.security.interfaces.ECPublicKey
import java.security.spec.X509EncodedKeySpec

/**
 * Verifies a browser owner's explicit approval of an Android call-invite-only
 * binding request. This is cryptographic verification only: it does not save,
 * enroll, trust, connect, or authorize calls by itself.
 */
internal object AndroidBrowserBindingApprovalVerifier {
    private const val EXPECTED_ORIGIN = "https://coma39658-ctrl.github.io"
    private const val APPROVAL_DOMAIN = "EZERO-ANDROID-BIND-APPROVAL-1"
    private const val MAX_VALIDITY_SECONDS = 90L
    private const val SIGNATURE_BYTES = 64

    data class VerifiedApproval(
        val ownerFingerprint: String,
        val androidFingerprint: String,
        val nonceBase64Url: String,
        val expiresAtEpochSeconds: Long,
        val capability: String
    )

    fun verify(
        request: AndroidBrowserBindingProtocolV1.RequestFields,
        signatureBase64Url: String,
        scannedOwner: BrowserPermanentIdentityVerifier.VerifiedIdentity,
        nowEpochSeconds: Long
    ): VerifiedApproval {
        require(request.origin == EXPECTED_ORIGIN) { "WRONG_APP_ORIGIN" }
        require(request.ownerFingerprint == scannedOwner.fingerprintSha256) {
            "OWNER_FINGERPRINT_MISMATCH"
        }
        require(request.issuedAtEpochSeconds <= nowEpochSeconds + 30L) { "REQUEST_FROM_FUTURE" }
        require(request.expiresAtEpochSeconds > nowEpochSeconds) { "REQUEST_EXPIRED" }
        require(request.expiresAtEpochSeconds > request.issuedAtEpochSeconds) { "INVALID_EXPIRY" }
        require(request.expiresAtEpochSeconds - request.issuedAtEpochSeconds <= MAX_VALIDITY_SECONDS) {
            "REQUEST_VALIDITY_TOO_LONG"
        }
        require(request.nonceBase64Url.matches(Regex("^[A-Za-z0-9_-]{16,128}$"))) {
            "INVALID_NONCE"
        }

        val canonicalRequest = AndroidBrowserBindingProtocolV1.canonicalRequest(request)
        val androidSpki = BrowserPermanentIdentityVerifier.decodeBase64Url(
            request.androidPublicKeySpkiBase64Url
        )
        require(androidSpki.isNotEmpty() && androidSpki.size <= 180) { "INVALID_ANDROID_KEY_SIZE" }
        require(BrowserPermanentIdentityVerifier.sha256Hex(androidSpki) == request.androidFingerprint) {
            "ANDROID_FINGERPRINT_MISMATCH"
        }
        val androidPublicKey = KeyFactory.getInstance("EC")
            .generatePublic(X509EncodedKeySpec(androidSpki)) as? ECPublicKey
            ?: throw IllegalArgumentException("INVALID_ANDROID_PUBLIC_KEY")
        require(androidPublicKey.params.curve.field.fieldSize == 256) {
            "ANDROID_KEY_NOT_P256"
        }

        require(signatureBase64Url.matches(Regex("^[A-Za-z0-9_-]{80,120}$"))) {
            "INVALID_APPROVAL_SIGNATURE_ENCODING"
        }
        val signatureBytes = BrowserPermanentIdentityVerifier.decodeBase64Url(signatureBase64Url)
        require(signatureBytes.size == SIGNATURE_BYTES) { "INVALID_APPROVAL_SIGNATURE_SIZE" }

        val ownerSpki = BrowserPermanentIdentityVerifier.decodeBase64Url(
            scannedOwner.publicKeySpkiBase64Url
        )
        val ownerPublicKey = KeyFactory.getInstance("EC")
            .generatePublic(X509EncodedKeySpec(ownerSpki)) as? ECPublicKey
            ?: throw IllegalArgumentException("INVALID_OWNER_PUBLIC_KEY")
        require(ownerPublicKey.params.curve.field.fieldSize == 256) { "OWNER_KEY_NOT_P256" }

        val signedBytes = (APPROVAL_DOMAIN + "\n" +
            String(canonicalRequest, StandardCharsets.UTF_8))
            .toByteArray(StandardCharsets.UTF_8)
        val valid = Signature.getInstance("SHA256withECDSA").run {
            initVerify(ownerPublicKey)
            update(signedBytes)
            verify(AndroidBrowserBindingProtocolV1.p1363ToDer(signatureBytes))
        }
        require(valid) { "OWNER_APPROVAL_SIGNATURE_INVALID" }

        return VerifiedApproval(
            ownerFingerprint = request.ownerFingerprint,
            androidFingerprint = request.androidFingerprint,
            nonceBase64Url = request.nonceBase64Url,
            expiresAtEpochSeconds = request.expiresAtEpochSeconds,
            capability = "call-invite-only"
        )
    }
}
