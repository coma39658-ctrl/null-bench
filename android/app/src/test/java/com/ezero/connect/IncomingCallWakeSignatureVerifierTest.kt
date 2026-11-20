package com.ezero.connect

import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class IncomingCallWakeSignatureVerifierTest {
    private val pair: KeyPair by lazy {
        KeyPairGenerator.getInstance("EC").apply { initialize(256) }.generateKeyPair()
    }

    private fun data() = mapOf(
        "wake_v" to "1",
        "call_id" to "call_12345678",
        "mode" to "AUDIO",
        "expires_at" to "1800000030000",
        "nonce" to "nonce_1234567890"
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
            IncomingCallWakeSignatureVerifier.verify(data(), pair.public, signed())
        )
    }

    @Test fun rejectsModifiedCallFields() {
        val signature = signed()
        val modified = data().toMutableMap().apply { put("mode", "VIDEO") }
        assertFalse(
            IncomingCallWakeSignatureVerifier.verify(modified, pair.public, signature)
        )
    }

    @Test fun rejectsModifiedSignature() {
        val signature = signed().also { it[it.lastIndex] = (it.last().toInt() xor 1).toByte() }
        assertFalse(
            IncomingCallWakeSignatureVerifier.verify(data(), pair.public, signature)
        )
    }

    @Test fun rejectsUnknownVersionMissingNonceAndInvalidMode() {
        assertFalse(
            IncomingCallWakeSignatureVerifier.verify(
                data() + ("wake_v" to "2"), pair.public, signed()
            )
        )
        assertFalse(
            IncomingCallWakeSignatureVerifier.verify(
                data() - "nonce", pair.public, signed()
            )
        )
        assertFalse(
            IncomingCallWakeSignatureVerifier.verify(
                data() + ("mode" to "TEXT"), pair.public, signed()
            )
        )
    }

    @Test fun rejectsUnsignedOrUnpinnedProductionWakeup() {
        assertFalse(IncomingCallWakeSignatureVerifier.verify(data()))
    }
}
