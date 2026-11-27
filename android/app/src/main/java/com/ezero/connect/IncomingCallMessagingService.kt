package com.ezero.connect

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class IncomingCallMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Firebase may refresh a token while the app is not open. Register only
        // if this installation already has Worker-confirmed enrollment.
        // Never log or expose the token.
        Thread { AndroidFcmTokenRegistrationV1.registerIfEnrolled(this, token) }.start()
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
