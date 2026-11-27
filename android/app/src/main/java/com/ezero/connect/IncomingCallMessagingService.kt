package com.ezero.connect

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class IncomingCallMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        AndroidPushTokenRegistrationV1.onNewToken(applicationContext, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // Only data-only, pinned-key server-signed, fresh wake-ups may alert.
        if (message.notification != null) return
        if (!IncomingCallWakeSignatureVerifier.verify(message.data)) return
        val payload = IncomingCallPayload.parse(message.data) ?: return
        if (!IncomingCallWakeReplayGuardV1.consume(this, payload.callId, message.data)) return
        IncomingCallNotifications.show(
            context = this,
            callId = payload.callId,
            mode = payload.mode,
            callerAlias = payload.callerAlias,
            expiresAt = payload.expiresAt
        )
    }
}
