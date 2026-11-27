package com.ezero.connect

import android.content.Context
import android.util.Base64
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.security.SecureRandom

/**
 * Registers an FCM token only after the isolated Worker has confirmed device enrollment.
 * Tokens are sent over HTTPS, never persisted or logged by this client.
 */
internal object AndroidPushTokenRegistrationV1 {
    private const val PREFS = "ezero_android_enrollment_state_v1"
    private const val KEY_SERVER_ENROLLED = "server_enrolled"
    private const val KEY_DEVICE_FP = "last_approved_device_fp"
    private const val MAX_TOKEN_LENGTH = 4096

    fun onNewToken(context: Context, token: String) {
        registerAsync(context.applicationContext, token)
    }

    fun requestCurrentToken(context: Context) {
        val appContext = context.applicationContext
        if (BuildConfig.ANDROID_ENROLLMENT_WORKER_ENDPOINT.isBlank()) return
        if (FirebaseApp.getApps(appContext).isEmpty()) return
        try {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result
                    if (!token.isNullOrBlank()) registerAsync(appContext, token)
                }
            }
        } catch (_: Exception) {
            // Firebase is not configured on this build; fail closed without logging secrets.
        }
    }

    private fun registerAsync(context: Context, token: String) {
        if (token.length !in 20..MAX_TOKEN_LENGTH) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_SERVER_ENROLLED, false)) return
        val endpoint = BuildConfig.ANDROID_ENROLLMENT_WORKER_ENDPOINT
        if (endpoint.isBlank()) return
        Thread {
            try { register(context, endpoint, token) } catch (_: Exception) {
                // Registration is retried by the next FCM token refresh or app enrollment sync.
            }
        }.start()
    }

    internal fun canonicalBytes(deviceFp: String, issuedAt: String, nonce: String, tokenHash: String): ByteArray {
        require(deviceFp.matches(Regex("^[a-f0-9]{64}$"))) { "BAD_DEVICE_FINGERPRINT" }
        require(issuedAt.matches(Regex("^\\d{13}$"))) { "BAD_ISSUED_AT" }
        require(nonce.matches(Regex("^[A-Za-z0-9_-]{16,128}$"))) { "BAD_NONCE" }
        require(tokenHash.matches(Regex("^[a-f0-9]{64}$"))) { "BAD_TOKEN_HASH" }
        return ("EZERO_ANDROID_PUSH_TOKEN_V1\n" +
            "device_fp=$deviceFp\n" +
            "issued_at=$issuedAt\n" +
            "nonce=$nonce\n" +
            "token_sha256=$tokenHash\n").toByteArray(Charsets.UTF_8)
    }

    private fun register(context: Context, baseUrl: String, token: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_SERVER_ENROLLED, false)) return
        val identity = AndroidEnrollmentKeyStore.getOrCreatePublicIdentity()
        if (prefs.getString(KEY_DEVICE_FP, null) != identity.fingerprint) return

        val issuedAt = System.currentTimeMillis().toString()
        val random = ByteArray(24).also { SecureRandom().nextBytes(it) }
        val nonce = Base64.encodeToString(random, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        val tokenHash = MessageDigest.getInstance("SHA-256").digest(token.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }
        val canonical = canonicalBytes(identity.fingerprint, issuedAt, nonce, tokenHash)
        val signature = AndroidEnrollmentKeyStore.signCanonicalBytes(canonical)
        val signatureB64 = Base64.encodeToString(
            signature, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
        )
        val body = JSONObject()
            .put("device_fp", identity.fingerprint)
            .put("issued_at", issuedAt)
            .put("nonce", nonce)
            .put("fcm_token", token)
            .put("device_signature", signatureB64)
            .toString()
            .toByteArray(Charsets.UTF_8)
        require(body.size <= 8192) { "TOKEN_REGISTRATION_BODY_TOO_LARGE" }

        val parsed = URL(baseUrl.trimEnd('/'))
        require(parsed.protocol == "https" && parsed.host.endsWith(".workers.dev") &&
            parsed.path.isEmpty() && parsed.query == null && parsed.ref == null && parsed.userInfo == null) {
            "WORKER_ENDPOINT_NOT_ALLOWED"
        }
        val connection = (URL(parsed.toString() + "/v1/android/devices/current/push-token")
            .openConnection() as HttpURLConnection).apply {
            requestMethod = "PUT"
            connectTimeout = 5000
            readTimeout = 10000
            instanceFollowRedirects = false
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Cache-Control", "no-store")
            setFixedLengthStreamingMode(body.size)
        }
        try {
            connection.outputStream.use { it.write(body) }
            val status = connection.responseCode
            require(status in 200..299) { "TOKEN_REGISTRATION_HTTP_$status" }
            // Do not read, persist, or log response content or the FCM token.
        } finally {
            connection.disconnect()
        }
    }
}
