package com.ezero.connect

import org.json.JSONObject
import java.nio.charset.StandardCharsets

/**
 * Strict local parser for the browser-to-Android identity proof QR.
 *
 * This validates shape, bounds, expiry and installation binding only. It does NOT
 * authenticate the browser signature, establish friendship, enroll the device,
 * or authorize calls. Those decisions belong to the private binding service.
 */
internal object BrowserAndroidIdentityProofQrV1 {
    private const val TYPE = "EZERO_BINDING_IDENTITY_PROOF_V1"
    private const val PROTOCOL = "EZERO_IDENTITY_INSTALLATION_BINDING_V1"
    private const val ORIGIN = "https://coma39658-ctrl.github.io"
    private const val MAX_QR_CHARS = 4096
    private const val MAX_FUTURE_MILLIS = 60_000L
    private val TOP_KEYS = setOf("type", "statement", "signature", "encoding")
    private val STATEMENT_KEYS = setOf(
        "protocol", "origin", "challengeId", "nonce", "expiresAt",
        "relationshipId", "identityFingerprint", "installationFingerprint", "installationId"
    )

    data class Proof(
        val challengeId: String,
        val nonce: String,
        val expiresAt: Long,
        val relationshipId: String,
        val identityFingerprint: String,
        val installationFingerprint: String,
        val installationId: String,
        val signatureP1363: ByteArray,
        val canonicalBytes: ByteArray
    )

    fun decode(raw: String, expectedInstallationFingerprint: String, expectedInstallationId: String, nowMillis: Long = System.currentTimeMillis()): Proof {
        require(raw.isNotEmpty() && raw.length <= MAX_QR_CHARS) { "QR_SIZE_INVALID" }
        require(expectedInstallationFingerprint.matches(Regex("^[a-f0-9]{64}$"))) { "LOCAL_INSTALLATION_FINGERPRINT_INVALID" }
        require(expectedInstallationId.matches(Regex("^[A-Za-z0-9_-]{8,128}$"))) { "LOCAL_INSTALLATION_ID_INVALID" }

        val root = JSONObject(raw)
        require(root.keySet() == TOP_KEYS) { "QR_FIELDS_INVALID" }
        require(root.getString("type") == TYPE) { "QR_TYPE_INVALID" }
        require(root.getString("encoding") == "P1363_BASE64URL") { "SIGNATURE_ENCODING_INVALID" }

        val statement = root.getJSONObject("statement")
        require(statement.keySet() == STATEMENT_KEYS) { "STATEMENT_FIELDS_INVALID" }
        require(statement.getString("protocol") == PROTOCOL) { "PROTOCOL_INVALID" }
        require(statement.getString("origin") == ORIGIN) { "ORIGIN_INVALID" }

        val challengeId = statement.getString("challengeId")
        val nonce = statement.getString("nonce")
        val expiresText = statement.getString("expiresAt")
        val relationshipId = statement.getString("relationshipId")
        val identityFingerprint = statement.getString("identityFingerprint")
        val installationFingerprint = statement.getString("installationFingerprint")
        val installationId = statement.getString("installationId")
        val signatureText = root.getString("signature")

        require(challengeId.matches(Regex("^[A-Za-z0-9_-]{16,128}$"))) { "CHALLENGE_ID_INVALID" }
        require(nonce.matches(Regex("^[A-Za-z0-9_-]{22,128}$"))) { "NONCE_INVALID" }
        require(expiresText.matches(Regex("^[0-9]{13}$"))) { "EXPIRY_FORMAT_INVALID" }
        val expiresAt = expiresText.toLong()
        require(expiresAt > nowMillis && expiresAt - nowMillis <= MAX_FUTURE_MILLIS) { "CHALLENGE_EXPIRED_OR_TOO_LONG" }
        require(relationshipId.matches(Regex("^[a-f0-9]{64}$"))) { "RELATIONSHIP_ID_INVALID" }
        require(identityFingerprint.matches(Regex("^([A-F0-9]{2}:){31}[A-F0-9]{2}$"))) { "IDENTITY_FINGERPRINT_INVALID" }
        require(installationFingerprint.matches(Regex("^[a-f0-9]{64}$"))) { "INSTALLATION_FINGERPRINT_INVALID" }
        require(installationId.matches(Regex("^[A-Za-z0-9_-]{8,128}$"))) { "INSTALLATION_ID_INVALID" }
        require(installationFingerprint == expectedInstallationFingerprint && installationId == expectedInstallationId) {
            "QR_FOR_DIFFERENT_INSTALLATION"
        }

        val signature = BrowserPermanentIdentityVerifier.decodeBase64Url(signatureText)
        require(signature.size == 64) { "SIGNATURE_SIZE_INVALID" }

        // Canonical V1 byte sequence: UTF-8, exact field order, LF separators, no trailing LF.
        val canonical = listOf(
            PROTOCOL, ORIGIN, challengeId, nonce, expiresText, relationshipId,
            identityFingerprint, installationFingerprint, installationId
        ).joinToString("\n").toByteArray(StandardCharsets.UTF_8)

        return Proof(
            challengeId, nonce, expiresAt, relationshipId, identityFingerprint,
            installationFingerprint, installationId, signature, canonical
        )
    }
}
