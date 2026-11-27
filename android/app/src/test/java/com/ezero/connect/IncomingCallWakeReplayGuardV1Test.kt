package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotNull
import org.junit.Test

class IncomingCallWakeReplayGuardV1Test {
    private val now = 1_800_000_000_000L

    @Test fun acceptsFirstWakeAndRejectsExactReplay() {
        val first = IncomingCallWakeReplayGuardV1.consumeOnce(
            emptySet(), "call_12345678", "nonce_1234567890", now + 30_000, now
        )
        assertNotNull(first)
        assertNull(IncomingCallWakeReplayGuardV1.consumeOnce(
            first!!, "call_12345678", "nonce_1234567890", now + 30_000, now
        ))
    }

    @Test fun rejectsReusedNonceOrCallId() {
        val first = IncomingCallWakeReplayGuardV1.consumeOnce(
            emptySet(), "call_12345678", "nonce_1234567890", now + 30_000, now
        )!!
        assertNull(IncomingCallWakeReplayGuardV1.consumeOnce(
            first, "call_87654321", "nonce_1234567890", now + 30_000, now
        ))
        assertNull(IncomingCallWakeReplayGuardV1.consumeOnce(
            first, "call_12345678", "nonce_0987654321", now + 30_000, now
        ))
    }

    @Test fun expiresOldEntriesAndBoundsStorage() {
        val old = setOf("oldnonce123456789|oldcall123|\${now - 1}")
        val fresh = IncomingCallWakeReplayGuardV1.consumeOnce(
            old, "call_12345678", "nonce_1234567890", now + 30_000, now
        )!!
        assertEquals(1, fresh.size)
        var entries = emptySet<String>()
        repeat(140) { index ->
            entries = IncomingCallWakeReplayGuardV1.consumeOnce(
                entries, "call_\${index.toString().padStart(8, '0')}",
                "nonce_\${index.toString().padStart(8, '0')}", now + 30_000, now
            )!!
        }
        assertEquals(128, entries.size)
    }

    @Test fun rejectsExpiredAndOverlongWake() {
        assertNull(IncomingCallWakeReplayGuardV1.consumeOnce(
            emptySet(), "call_12345678", "nonce_1234567890", now, now
        ))
        assertNull(IncomingCallWakeReplayGuardV1.consumeOnce(
            emptySet(), "call_12345678", "nonce_1234567890", now + 120_001, now
        ))
    }
}
