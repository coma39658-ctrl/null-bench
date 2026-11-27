package com.ezero.connect

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.KeyPairGenerator
import java.security.Signature
import java.util.Base64

class AndroidFcmTokenProtocolV1Test {
    @Test
    fun canonicalMessageMatchesTheWorkerFieldOrderAndFinalNewline() {
        val bytes = AndroidFcmTokenProtocolV1.canonicalMessage(
            "a".repeat(64),
            "tokenHash_123",
            "commandId_1234567890",
            "1795780800000",
            "nonce_123456789012345678901234"
        )
        val expected = (
            "EZERO_ANDROID_FCM_TOKEN_V1\n" +
                "device_fp=${"a".repeat(64)}\n" +
                "token_sha256=tokenHash_123\n" +
                "command_id=commandId_1234567890\n" +
                "issued_at=1795780800000\n" +
                "nonce=nonce_123456789012345678901234\n" +
                "audience=https://coma39658-ctrl.github.io\n"
            ).toByteArray(Charsets.UTF_8)
        assertArrayEquals(expected, bytes)
    }

    @Test
    fun canonicalMessageVerifiesWithP256Sha256() {
        val pair = KeyPairGenerator.getInstance("EC").apply {
            initialize(java.security.spec.ECGenParameterSpec("secp256r1"))
        }.generateKeyPair()
        val canonical = AndroidFcmTokenProtocolV1.canonicalMessage(
            "b".repeat(64), "hash", "command_123456789012", "1795780800000", "nonce_123456789012345678901234"
        )
        val signature = Signature.getInstance("SHA256withECDSA").run {
            initSign(pair.private)
            update(canonical)
            sign()
        }
        val verified = Signature.getInstance("SHA256withECDSA").run {
            initVerify(pair.public)
            update(canonical)
            verify(signature)
        }
        assertTrue(verified)
    }

    @Test
    fun tokenHashIsStableUrlSafeAndPaddingFree() {
        val token = "fcm:staging-token_abcdefghijklmnopqrstuvwxyz0123456789"
        val hash = AndroidFcmTokenProtocolV1.tokenSha256Base64Url(token)
        assertTrue(hash.matches(Regex("^[A-Za-z0-9_-]{43}$")))
        assertFalse(hash.contains("="))
        assertEquals(
            hash,
            Base64.getUrlEncoder().withoutPadding().encodeToString(
                java.security.MessageDigest.getInstance("SHA-256").digest(token.toByteArray(Charsets.UTF_8))
            )
        )
    }

    @Test
    fun rejectsMalformedFcmTokens() {
        assertTrue(AndroidFcmTokenProtocolV1.isValidToken("fcm:valid-token_abcdefghijklmnopqrstuvwxyz0123456789"))
        assertFalse(AndroidFcmTokenProtocolV1.isValidToken("short"))
        assertFalse(AndroidFcmTokenProtocolV1.isValidToken("token with spaces abcdefghijklmnopqrstuvwxyz"))
        assertFalse(AndroidFcmTokenProtocolV1.isValidToken("x".repeat(2049)))
    }
}
