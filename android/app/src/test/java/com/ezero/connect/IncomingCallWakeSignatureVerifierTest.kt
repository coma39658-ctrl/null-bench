package com.ezero.connect

import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class IncomingCallWakeSignatureVerifierTest {
    private val nowMillis = 1_800_000_000_000L
    private val pair: KeyPair by lazy {
        KeyPairGenerator.getInstance("EC").apply { initialize(256) }.generateKeyPair()
    }

    private fun data() = mapOf(
        "wake_v" to "1",
        "call_id" to "call_12345678",
        "mode" to "AUDIO",
        "expires_at" to "1800000090000",
        "nonce" to "nonce_1234567890",
        "server_sig" to "AA"
    )

    private fun signed(fields: Map<String, String> = data()): ByteArray {
        val canonical = IncomingCallWakeSignatureVerifier.canonicalMessage(
            fields["wake_v"]!!,
            fields["call_id"]!!,
            fields["mode"]!!,
            fields["expires_at"]!!,
            fields["nonce"]!!
        )
        return Signature.getInstance("SHA256withECDSA").run {
            initSign(pair.private)
            update(canonical)
            sign()
        }
    }

    @Test fun acceptsValidServerSignature() {
        assertTrue(
            IncomingCallWakeSignatureVerifier.verify(data(), pair.public, signed(), nowMillis)
        )
    }

    @Test fun rejectsModifiedCallFields() {
        val signature = signed()
        val modified = data().toMutableMap().apply { put("mode", "VIDEO") }
        assertFalse(
            IncomingCallWakeSignatureVerifier.verify(modified, pair.public, signature, nowMillis)
        )
    }

    @Test fun rejectsModifiedSignature() {
        val signature = signed().also { it[it.lastIndex] = (it.last().toInt() xor 1).toByte() }
        assertFalse(
            IncomingCallWakeSignatureVerifier.verify(data(), pair.public, signature, nowMillis)
        )
    }

    @Test fun rejectsUnknownVersionMissingNonceAndInvalidMode() {
        assertFalse(
            IncomingCallWakeSignatureVerifier.verify(
                data() + ("wake_v" to "2"), pair.public, signed(), nowMillis
            )
        )
        assertFalse(
            IncomingCallWakeSignatureVerifier.verify(
                data() - "nonce", pair.public, signed(), nowMillis
            )
        )
        assertFalse(
            IncomingCallWakeSignatureVerifier.verify(
                data() + ("mode" to "TEXT"), pair.public, signed(), nowMillis
            )
        )
    }

    @Test fun rejectsExpiredWakeup() {
        val expired = data() + ("expires_at" to (nowMillis - 1).toString())
        assertFalse(IncomingCallWakeSignatureVerifier.verify(expired, pair.public, signed(expired), nowMillis))
    }

    @Test fun rejectsWakeupBeyond120Seconds() {
        val tooFar = data() + ("expires_at" to (nowMillis + 120_001).toString())
        assertFalse(IncomingCallWakeSignatureVerifier.verify(tooFar, pair.public, signed(tooFar), nowMillis))
    }

    @Test fun acceptsWakeupAt120SecondBoundary() {
        val boundary = data() + ("expires_at" to (nowMillis + 120_000).toString())
        assertTrue(IncomingCallWakeSignatureVerifier.verify(boundary, pair.public, signed(boundary), nowMillis))
    }

    @Test fun rejectsUnsignedOrUnpinnedProductionWakeup() {
        assertFalse(IncomingCallWakeSignatureVerifier.verify(data()))
    }
}
