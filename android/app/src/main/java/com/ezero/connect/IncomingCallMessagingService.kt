package com.ezero.connect

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class IncomingCallMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        // TODO(stage): send token over authenticated device-registration API.
        // Never log or expose the FCM token. No backend endpoint is wired yet.
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // Only data-only, server-signed wake-ups may create an actionable alert.
        // Until a reviewed staging public key is pinned, verification fails closed.
        if (message.notification != null) return
        if (!IncomingCallWakeSignatureVerifier.verify(message.data)) return

        val payload = IncomingCallPayload.parse(message.data) ?: return
        // Persist nonce and call-ID before showing the notification. Duplicate
        // FCM delivery and process restarts must not resurrect an already-seen call.
        val replayGuard = IncomingCallReplayGuard(
            SharedPreferencesWakeReplayStore(applicationContext)
        )
        if (!replayGuard.accept(payload.nonce, payload.callId, payload.expiresAt)) return

        IncomingCallNotifications.show(
            context = this,
            callId = payload.callId,
            mode = payload.mode,
            callerAlias = payload.callerAlias,
            expiresAt = payload.expiresAt
        )
    }
}
