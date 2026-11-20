package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotNull
import org.junit.Test

class IncomingCallPayloadTest {
    private val now = 1_800_000_000_000L

    private fun valid(
        callId: String = "call_12345678",
        mode: String = "AUDIO",
        expiresAt: String = (now + 30_000L).toString(),
        alias: String = "A friend"
    ) = mapOf(
        "call_id" to callId,
        "mode" to mode,
        "expires_at" to expiresAt,
        "caller_alias" to alias
    )

    @Test fun acceptsValidAudioAndVideoWakeups() {
        assertEquals("AUDIO", IncomingCallPayload.parse(valid(), now)?.mode)
        assertEquals("VIDEO", IncomingCallPayload.parse(valid(mode = "VIDEO"), now)?.mode)
    }

    @Test fun rejectsMissingMalformedAndUnsafeIdentifiers() {
        assertNull(IncomingCallPayload.parse(emptyMap(), now))
        assertNull(IncomingCallPayload.parse(valid(callId = "short"), now))
        assertNull(IncomingCallPayload.parse(valid(callId = "call/12345678"), now))
        assertNull(IncomingCallPayload.parse(valid(callId = "x".repeat(129)), now))
    }

    @Test fun rejectsUnknownModesAndMalformedExpiry() {
        assertNull(IncomingCallPayload.parse(valid(mode = "TEXT"), now))
        assertNull(IncomingCallPayload.parse(valid(expiresAt = "not-a-time"), now))
    }

    @Test fun rejectsExpiredAndOverlongWakeupWindows() {
        assertNull(IncomingCallPayload.parse(valid(expiresAt = now.toString()), now))
        assertNull(IncomingCallPayload.parse(valid(expiresAt = (now - 1).toString()), now))
        assertNull(IncomingCallPayload.parse(valid(expiresAt = (now + 120_001L).toString()), now))
        assertNotNull(IncomingCallPayload.parse(valid(expiresAt = (now + 120_000L).toString()), now))
    }

    @Test fun sanitizesAndBoundsCallerAlias() {
        val parsed = IncomingCallPayload.parse(valid(alias = "  Alice\n\u0000  Smith  "), now)
        assertEquals("Alice Smith", parsed?.callerAlias)
        assertEquals(48, IncomingCallPayload.parse(valid(alias = "A".repeat(60)), now)?.callerAlias?.length)
        assertEquals("E-ZERO friend", IncomingCallPayload.parse(valid(alias = "\u0000  "), now)?.callerAlias)
    }
}
