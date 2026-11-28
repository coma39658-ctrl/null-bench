package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class IncomingCallReplayGuardTest {
    private class FakeStore : WakeReplayStore {
        val entries = mutableMapOf<String, Long>()

        override fun contains(key: String): Boolean = entries.containsKey(key)

        override fun record(nonceKey: String, callKey: String, expiresAt: Long): Boolean {
            entries[nonceKey] = expiresAt
            entries[callKey] = expiresAt
            return true
        }

        override fun removeExpired(nowMillis: Long) {
            entries.entries.removeAll { it.value <= nowMillis }
        }

        override fun size(): Int = entries.size
    }

    private val now = 1_800_000_000_000L

    @Test fun acceptsFirstWakeAndRejectsDuplicateNonce() {
        val guard = IncomingCallReplayGuard(FakeStore())
        assertTrue(guard.accept("nonce_1234567890", "call_12345678", now + 30_000, now))
        assertFalse(guard.accept("nonce_1234567890", "call_87654321", now + 30_000, now))
    }

    @Test fun rejectsDuplicateCallIdEvenWithFreshNonce() {
        val guard = IncomingCallReplayGuard(FakeStore())
        assertTrue(guard.accept("nonce_1234567890", "call_12345678", now + 30_000, now))
        assertFalse(guard.accept("nonce_0987654321", "call_12345678", now + 30_000, now))
    }

    @Test fun removesExpiredEntriesBeforeAcceptingNewWake() {
        val store = FakeStore()
        val guard = IncomingCallReplayGuard(store)
        assertTrue(guard.accept("nonce_1234567890", "call_12345678", now + 1_000, now))
        assertTrue(guard.accept("nonce_0987654321", "call_87654321", now + 30_000, now + 1_000))
        assertEquals(2, store.size())
    }

    @Test fun rejectsMalformedAndExpiredWakeups() {
        val guard = IncomingCallReplayGuard(FakeStore())
        assertFalse(guard.accept("short", "call_12345678", now + 30_000, now))
        assertFalse(guard.accept("nonce_1234567890", "short", now + 30_000, now))
        assertFalse(guard.accept("nonce_1234567890", "call_12345678", now, now))
        assertFalse(guard.accept("nonce_1234567890", "call_12345678", now + 120_001, now))
    }

    @Test fun failsClosedWhenReplayStoreIsFull() {
        val store = FakeStore()
        val guard = IncomingCallReplayGuard(store, maxEntries = 2)
        assertTrue(guard.accept("nonce_1234567890", "call_12345678", now + 30_000, now))
        assertFalse(guard.accept("nonce_0987654321", "call_87654321", now + 30_000, now))
        assertEquals(2, store.size())
    }
}
