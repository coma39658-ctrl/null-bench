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
        val payload = IncomingCallPayload.parse(message.data) ?: return
        IncomingCallNotifications.show(
            context = this,
            callId = payload.callId,
            mode = payload.mode,
            callerAlias = payload.callerAlias,
            expiresAt = payload.expiresAt
        )
    }
}
