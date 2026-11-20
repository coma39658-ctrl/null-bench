package com.ezero.connect

import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.PublicKey
import java.security.Signature
import java.security.spec.X509EncodedKeySpec

/**
 * Verifies server-authenticated call wake-ups before any notification is shown.
 *
 * The build-time value is a public SPKI key only. An empty or malformed value
 * fails closed. The corresponding private key must remain server-side.
 */
internal object IncomingCallWakeSignatureVerifier {
    private val NONCE = Regex("^[A-Za-z0-9_-]{16,128}$")
    private const val MAX_WAKE_LIFETIME_MS = 120_000L

    fun verify(data: Map<String, String>): Boolean {
        val publicKey = loadPinnedPublicKey(
            BuildConfig.EZERO_CALL_WAKE_STAGING_PUBLIC_KEY_SPKI_BASE64
        ) ?: return false

        val signature = try {
            val encoded = data["server_sig"] ?: return false
            Base64.decode(encoded, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        } catch (_: Exception) {
            return false
        }
        return verify(data, publicKey, signature)
    }

    internal fun loadPinnedPublicKey(encodedSpkiBase64: String): PublicKey? {
        if (encodedSpkiBase64.isBlank()) return null
        return try {
            val encoded = java.util.Base64.getDecoder().decode(encodedSpkiBase64)
            val key = KeyFactory.getInstance("EC")
                .generatePublic(X509EncodedKeySpec(encoded)) as java.security.interfaces.ECPublicKey
            if (key.params.curve.field.fieldSize != 256) null else key
        } catch (_: Exception) {
            null
        }
    }

    internal fun verify(
        data: Map<String, String>,
        publicKey: PublicKey,
        signatureBytes: ByteArray,
        nowMillis: Long = System.currentTimeMillis()
    ): Boolean {
        val wakeVersion = data["wake_v"] ?: return false
        val callId = data["call_id"] ?: return false
        val mode = data["mode"] ?: return false
        val expiresAt = data["expires_at"] ?: return false
        val nonce = data["nonce"] ?: return false

        if (wakeVersion != "1") return false
        if (!Regex("^[A-Za-z0-9_-]{8,128}$").matches(callId)) return false
        if (mode != "AUDIO" && mode != "VIDEO") return false
        val expiryMillis = expiresAt.toLongOrNull() ?: return false
        if (expiryMillis <= nowMillis) return false
        if (expiryMillis - nowMillis > MAX_WAKE_LIFETIME_MS) return false
        if (!NONCE.matches(nonce)) return false
        if (signatureBytes.isEmpty() || signatureBytes.size > 256) return false

        val canonical = canonicalMessage(wakeVersion, callId, mode, expiresAt, nonce)
        return try {
            Signature.getInstance("SHA256withECDSA").run {
                initVerify(publicKey)
                update(canonical)
                verify(signatureBytes)
            }
        } catch (_: Exception) {
            false
        }
    }

    internal fun canonicalMessage(
        wakeVersion: String,
        callId: String,
        mode: String,
        expiresAt: String,
        nonce: String
    ): ByteArray = (
        "EZERO_CALL_WAKE_V1\n" +
            "wake_v=$wakeVersion\n" +
            "call_id=$callId\n" +
            "mode=$mode\n" +
            "expires_at=$expiresAt\n" +
            "nonce=$nonce\n"
        ).toByteArray(StandardCharsets.UTF_8)
}
