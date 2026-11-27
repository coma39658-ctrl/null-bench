package com.ezero.connect

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class IncomingCallMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        AndroidPushTokenRegistrationV1.onNewToken(applicationContext, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // Only data-only, server-signed wake-ups may create an actionable alert.
        // Until a reviewed staging public key is pinned, verification fails closed.
        if (message.notification != null) return
        if (!IncomingCallWakeSignatureVerifier.verify(message.data)) return

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
