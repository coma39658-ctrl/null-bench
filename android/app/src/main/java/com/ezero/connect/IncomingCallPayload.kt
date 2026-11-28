package com.ezero.connect

/**
 * Defensive parser for the data-only FCM wake-up contract.
 *
 * This validates shape and freshness only. It is NOT authentication: the backend
 * must verify the caller, saved-friend relationship, signature and replay window.
 * Caller names are deliberately NOT trusted from push data; they must be resolved
 * from the locally verified saved-friend identity after the signed invite is consumed.
 */
internal data class IncomingCallPayload(
    val callId: String,
    val mode: String,
    val nonce: String,
    val callerAlias: String,
    val expiresAt: Long
) {
    companion object {
        private val CALL_ID = Regex("^[A-Za-z0-9_-]{8,128}$")
        private val NONCE = Regex("^[A-Za-z0-9_-]{16,128}$")
        private const val MAX_FUTURE_MS = 120_000L
        private const val DEFAULT_ALIAS = "E-ZERO friend"

        fun parse(data: Map<String, String>, nowMs: Long = System.currentTimeMillis()): IncomingCallPayload? {
            val callId = data["call_id"] ?: return null
            val mode = data["mode"] ?: return null
            val nonce = data["nonce"] ?: return null
            val expiresAt = data["expires_at"]?.toLongOrNull() ?: return null

            if (!CALL_ID.matches(callId)) return null
            if (!NONCE.matches(nonce)) return null
            if (mode != "AUDIO" && mode != "VIDEO") return null
            if (expiresAt <= nowMs || expiresAt - nowMs > MAX_FUTURE_MS) return null

            // FCM is only a wake-up hint. Never display a caller-supplied name
            // before the sender's signed device identity and invite are authenticated.
            return IncomingCallPayload(callId, mode, nonce, DEFAULT_ALIAS, expiresAt)
        }
    }
}
