package com.ezero.connect

import java.nio.charset.StandardCharsets
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class AndroidBrowserBindingProtocolV1Test {
    private fun validFields() = AndroidBrowserBindingProtocolV1.RequestFields(
        origin = "https://ezero-save-friend-pr156-preview-v2.onrender.com",
        ownerFingerprint = "a".repeat(64),
        androidPublicKeySpkiBase64Url = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQc",
        androidFingerprint = "b".repeat(64),
        nonceBase64Url = "AQIDBAUGBwgJCgsMDQ4PEA",
        issuedAtEpochSeconds = 1_800_000_000L,
        expiresAtEpochSeconds = 1_800_000_090L
    )

    @Test
    fun canonicalRequestHasStableNineLineUtf8Encoding() {
        val expected = listOf(
            "EZERO-ANDROID-BIND-1",
            "https://ezero-save-friend-pr156-preview-v2.onrender.com",
            "a".repeat(64),
            "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQc",
            "b".repeat(64),
            "AQIDBAUGBwgJCgsMDQ4PEA",
            "1800000000",
            "1800000090",
            "call-invite-only"
        ).joinToString("\n").toByteArray(StandardCharsets.UTF_8)

        assertArrayEquals(expected, AndroidBrowserBindingProtocolV1.canonicalRequest(validFields()))
    }

    @Test
    fun rejectsLineInjectionAndOverlongChallenge() {
        assertThrows(IllegalArgumentException::class.java) {
            AndroidBrowserBindingProtocolV1.canonicalRequest(
                validFields().copy(origin = "https://example.test\nattacker")
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidBrowserBindingProtocolV1.canonicalRequest(
                validFields().copy(expiresAtEpochSeconds = 1_800_000_091L)
            )
        }
    }

    @Test
    fun derAndP1363ConversionsPreserveRealP256Signature() {
        val pair = KeyPairGenerator.getInstance("EC").apply {
            initialize(ECGenParameterSpec("secp256r1"))
        }.generateKeyPair()
        val message = AndroidBrowserBindingProtocolV1.canonicalRequest(validFields())
        val der = Signature.getInstance("SHA256withECDSA").run {
            initSign(pair.private)
            update(message)
            sign()
        }

        val p1363 = AndroidBrowserBindingProtocolV1.derToP1363(der)
        assertEquals(64, p1363.size)
        val restoredDer = AndroidBrowserBindingProtocolV1.p1363ToDer(p1363)
        val verified = Signature.getInstance("SHA256withECDSA").run {
            initVerify(pair.public)
            update(message)
            verify(restoredDer)
        }
        assertEquals(true, verified)
    }

    @Test
    fun rejectsMalformedP1363AndTrailingDerBytes() {
        assertThrows(IllegalArgumentException::class.java) {
            AndroidBrowserBindingProtocolV1.p1363ToDer(ByteArray(63))
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidBrowserBindingProtocolV1.derToP1363(byteArrayOf(0x30, 0x00, 0x00))
        }
    }
}
