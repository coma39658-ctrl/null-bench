package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.spec.ECGenParameterSpec
import java.util.Base64

class AndroidRootTrustPinV1Test {
    private fun root() = KeyPairGenerator.getInstance("EC").apply {
        initialize(ECGenParameterSpec("secp256r1"))
    }.generateKeyPair()
    private fun fp(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes)
        .joinToString("") { "%02x".format(it.toInt() and 0xff) }
    private fun b64(bytes: ByteArray) = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    @Test fun acceptsOnlyWellFormedP256RootWithMatchingFingerprint() {
        val key = root()
        val encoded = b64(key.public.encoded)
        val fingerprint = fp(key.public.encoded)
        val pin = AndroidRootTrustPinV1.validateCandidate(encoded, fingerprint)
        assertEquals(fingerprint, pin.fingerprint)
        assertEquals(encoded, pin.spkiBase64Url)
    }

    @Test fun rejectsFingerprintMismatch() {
        val key = root()
        assertThrows(IllegalArgumentException::class.java) {
            AndroidRootTrustPinV1.validateCandidate(b64(key.public.encoded), "0".repeat(64))
        }
    }

    @Test fun rejectsMalformedAndNonCanonicalBase64Url() {
        assertThrows(IllegalArgumentException::class.java) {
            AndroidRootTrustPinV1.validateCandidate("abc=", "0".repeat(64))
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidRootTrustPinV1.validateCandidate("a", "0".repeat(64))
        }
    }
}
