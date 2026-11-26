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
 * The staging key is intentionally empty until an independently generated,
 * reviewed backend public key is pinned. Empty means fail closed, not trust all.
 */
internal object IncomingCallWakeSignatureVerifier {
    // Set only to the public SPKI key published by the isolated staging sender.
    // Never put a private signing key or FCM credential in the Android app.
    private val PINNED_STAGING_PUBLIC_KEY_SPKI_BASE64 = BuildConfig.EZERO_WAKE_PUBLIC_KEY_SPKI_BASE64

    private val NONCE = Regex("^[A-Za-z0-9_-]{16,128}$")
    private const val MAX_WAKE_LIFETIME_MS = 120_000L

    fun verify(data: Map<String, String>): Boolean {
        val pinned = PINNED_STAGING_PUBLIC_KEY_SPKI_BASE64
        if (pinned.isBlank()) return false

        val publicKey = try {
            val encoded = Base64.decode(pinned, Base64.DEFAULT)
            KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(encoded))
        } catch (_: Exception) {
            return false
        }

        val signature = try {
            val encoded = data["server_sig"] ?: return false
            Base64.decode(encoded, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        } catch (_: Exception) {
            return false
        }
        return verify(data, publicKey, signature)
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
