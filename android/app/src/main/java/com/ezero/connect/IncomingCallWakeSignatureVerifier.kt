package com.ezero.connect

import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.PublicKey
import java.security.Signature
import java.security.spec.X509EncodedKeySpec

/** Verifies server-authenticated call wakes before any notification is shown. */
internal object IncomingCallWakeSignatureVerifier {
    private val NONCE = Regex("^[A-Za-z0-9_-]{16,128}$")
    private val CALL_ID = Regex("^[A-Za-z0-9_-]{8,128}$")
    private val REQUIRED_FIELDS = setOf("wake_v", "call_id", "mode", "expires_at", "nonce", "server_sig")
    private const val MAX_WAKE_LIFETIME_MS = 120_000L

    fun verify(data: Map<String, String>): Boolean {
        val pinned = BuildConfig.CALL_WAKE_PUBLIC_KEY_SPKI_BASE64
        if (pinned.isBlank() || data.keys != REQUIRED_FIELDS) return false
        val publicKey = try {
            val encoded = Base64.decode(pinned, Base64.DEFAULT)
            KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(encoded))
        } catch (_: Exception) { return false }
        val signature = try {
            val encoded = data["server_sig"] ?: return false
            Base64.decode(encoded, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        } catch (_: Exception) { return false }
        return verify(data, publicKey, signature)
    }

    internal fun verify(
        data: Map<String, String>,
        publicKey: PublicKey,
        signatureBytes: ByteArray,
        nowMillis: Long = System.currentTimeMillis()
    ): Boolean {
        if (data.keys != REQUIRED_FIELDS) return false
        val wakeVersion = data["wake_v"] ?: return false
        val callId = data["call_id"] ?: return false
        val mode = data["mode"] ?: return false
        val expiresAt = data["expires_at"] ?: return false
        val nonce = data["nonce"] ?: return false
        if (wakeVersion != "1" || !CALL_ID.matches(callId)) return false
        if (mode != "AUDIO" && mode != "VIDEO") return false
        val expiryMillis = expiresAt.toLongOrNull() ?: return false
        if (expiryMillis <= nowMillis || expiryMillis - nowMillis > MAX_WAKE_LIFETIME_MS) return false
        if (!NONCE.matches(nonce) || signatureBytes.isEmpty() || signatureBytes.size > 256) return false
        val canonical = canonicalMessage(wakeVersion, callId, mode, expiresAt, nonce)
        return try {
            Signature.getInstance("SHA256withECDSA").run {
                initVerify(publicKey); update(canonical); verify(signatureBytes)
            }
        } catch (_: Exception) { false }
    }

    internal fun canonicalMessage(
        wakeVersion: String, callId: String, mode: String, expiresAt: String, nonce: String
    ): ByteArray = (
        "EZERO_CALL_WAKE_V1\n" +
            "wake_v=$wakeVersion\n" +
            "call_id=$callId\n" +
            "mode=$mode\n" +
            "expires_at=$expiresAt\n" +
            "nonce=$nonce\n"
        ).toByteArray(StandardCharsets.UTF_8)
}
