package com.ezero.connect

/**
 * Defensive parser for the data-only FCM wake-up contract.
 *
 * This validates shape and freshness only. It is NOT authentication: the backend
 * must verify the caller, saved-friend relationship, signature and replay window.
 */
internal data class IncomingCallPayload(
    val callId: String,
    val mode: String,
    val callerAlias: String,
    val expiresAt: Long
) {
    companion object {
        private val CALL_ID = Regex("^[A-Za-z0-9_-]{8,128}$")
        private val WHITESPACE = Regex("\\s+")
        private const val MAX_FUTURE_MS = 120_000L
        private const val MAX_ALIAS_LENGTH = 48
        private const val DEFAULT_ALIAS = "E-ZERO friend"

        fun parse(data: Map<String, String>, nowMs: Long = System.currentTimeMillis()): IncomingCallPayload? {
            val callId = data["call_id"] ?: return null
            val mode = data["mode"] ?: return null
            val expiresAt = data["expires_at"]?.toLongOrNull() ?: return null

            if (!CALL_ID.matches(callId)) return null
            if (mode != "AUDIO" && mode != "VIDEO") return null
            if (expiresAt <= nowMs || expiresAt - nowMs > MAX_FUTURE_MS) return null

            val alias = data["caller_alias"]
                .orEmpty()
                .filterNot { it.isISOControl() }
                .replace(WHITESPACE, " ")
                .trim()
                .take(MAX_ALIAS_LENGTH)
                .ifBlank { DEFAULT_ALIAS }

            return IncomingCallPayload(callId, mode, alias, expiresAt)
        }
    }
}
