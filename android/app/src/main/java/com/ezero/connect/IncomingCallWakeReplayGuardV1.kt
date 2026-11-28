package com.ezero.connect

import android.content.Context

/** Durable bounded replay guard. It does not authenticate the caller identity. */
internal object IncomingCallWakeReplayGuardV1 {
    private const val PREFS = "ezero_call_wake_replay_v1"
    private const val KEY_ENTRIES = "entries"
    private const val MAX_ENTRIES = 128
    private const val MAX_FUTURE_MS = 120_000L
    private val lock = Any()

    internal fun consumeOnce(
        existing: Set<String>, callId: String, nonce: String, expiresAt: Long, nowMs: Long
    ): Set<String>? {
        if (!callId.matches(Regex("^[A-Za-z0-9_-]{8,128}$")) ||
            !nonce.matches(Regex("^[A-Za-z0-9_-]{16,128}$")) ||
            expiresAt <= nowMs || expiresAt - nowMs > MAX_FUTURE_MS) return null
        val fresh = existing.mapNotNull { entry ->
            val parts = entry.split("|")
            val expiry = parts.getOrNull(2)?.toLongOrNull()
            if (parts.size == 3 && expiry != null && expiry > nowMs) entry else null
        }.toMutableList()
        if (fresh.any { entry ->
            val parts = entry.split("|")
            parts[0] == nonce || parts[1] == callId
        }) return null
        fresh.add("$nonce|$callId|$expiresAt")
        while (fresh.size > MAX_ENTRIES) fresh.removeAt(0)
        return fresh.toSet()
    }

    fun consume(context: Context, callId: String, data: Map<String, String>): Boolean {
        val nonce = data["nonce"] ?: return false
        val expiresAt = data["expires_at"]?.toLongOrNull() ?: return false
        synchronized(lock) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val current = prefs.getStringSet(KEY_ENTRIES, emptySet())?.toSet() ?: emptySet()
            val updated = consumeOnce(current, callId, nonce, expiresAt, System.currentTimeMillis()) ?: return false
            return prefs.edit().putStringSet(KEY_ENTRIES, updated).commit()
        }
    }
}
