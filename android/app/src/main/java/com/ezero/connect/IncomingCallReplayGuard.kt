package com.ezero.connect

import android.content.Context
import android.content.SharedPreferences

/**
 * Local, persistent replay suppression for already-authenticated FCM wake-ups.
 *
 * Server-side nonce replay enforcement remains mandatory. This guard is a
 * second layer for duplicate delivery and process restarts on this installation.
 */
internal interface WakeReplayStore {
    fun contains(key: String): Boolean
    fun record(nonceKey: String, callKey: String, expiresAt: Long): Boolean
    fun removeExpired(nowMillis: Long)
    fun size(): Int
}

internal class SharedPreferencesWakeReplayStore(context: Context) : WakeReplayStore {
    private val preferences: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    override fun contains(key: String): Boolean = preferences.contains(key)

    override fun record(nonceKey: String, callKey: String, expiresAt: Long): Boolean =
        preferences.edit()
            .putLong(nonceKey, expiresAt)
            .putLong(callKey, expiresAt)
            .commit()

    override fun removeExpired(nowMillis: Long) {
        val editor = preferences.edit()
        var changed = false
        for ((key, value) in preferences.all) {
            if (key.startsWith(KEY_PREFIX) && value is Long && value <= nowMillis) {
                editor.remove(key)
                changed = true
            }
        }
        if (changed) editor.commit()
    }

    override fun size(): Int =
        preferences.all.keys.count { it.startsWith(KEY_PREFIX) }

    companion object {
        private const val PREFERENCES_NAME = "ezero_wake_replay_v1"
        private const val KEY_PREFIX = "wake_"
    }
}

internal class IncomingCallReplayGuard(
    private val store: WakeReplayStore,
    private val maxEntries: Int = 512
) {
    init {
        require(maxEntries >= 2) { "Replay store capacity must be at least two entries" }
    }

    @Synchronized
    fun accept(
        nonce: String,
        callId: String,
        expiresAt: Long,
        nowMillis: Long = System.currentTimeMillis()
    ): Boolean {
        if (!NONCE.matches(nonce) || !CALL_ID.matches(callId)) return false
        if (expiresAt <= nowMillis || expiresAt - nowMillis > MAX_FUTURE_MS) return false

        store.removeExpired(nowMillis)
        val nonceKey = KEY_PREFIX + "nonce_" + nonce
        val callKey = KEY_PREFIX + "call_" + callId
        if (store.contains(nonceKey) || store.contains(callKey)) return false

        // Fail closed rather than evicting unexpired replay evidence.
        if (store.size() + 2 > maxEntries) return false
        return store.record(nonceKey, callKey, expiresAt)
    }

    companion object {
        private const val KEY_PREFIX = "wake_"
        private const val MAX_FUTURE_MS = 120_000L
        private val NONCE = Regex("^[A-Za-z0-9_-]{16,128}$")
        private val CALL_ID = Regex("^[A-Za-z0-9_-]{8,128}$")
    }
}
