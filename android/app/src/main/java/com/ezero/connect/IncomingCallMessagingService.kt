package com.ezero.connect

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class IncomingCallMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        // TODO(stage): send token over authenticated device-registration API.
        // Never log or expose the FCM token. No backend endpoint is wired yet.
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // Call wake-ups must be data-only and high priority. Notification payloads
        // can be displayed by Android without this validation path.
        val data = message.data
        val callId = data["call_id"] ?: return
        val mode = data["mode"] ?: return
        val expiresAt = data["expires_at"]?.toLongOrNull() ?: return
        val callerAlias = data["caller_alias"] ?: "E-ZERO friend"

        val now = System.currentTimeMillis()
        if (!CALL_ID.matches(callId) ||
            (mode != "AUDIO" && mode != "VIDEO") ||
            expiresAt <= now ||
            expiresAt > now + MAX_FUTURE_MS
        ) return

        IncomingCallNotifications.show(
            context = this,
            callId = callId,
            mode = mode,
            callerAlias = callerAlias.take(48),
            expiresAt = expiresAt
        )
    }

    private companion object {
        val CALL_ID = Regex("^[A-Za-z0-9_-]{8,128}$")
        const val MAX_FUTURE_MS = 120_000L
    }
}
