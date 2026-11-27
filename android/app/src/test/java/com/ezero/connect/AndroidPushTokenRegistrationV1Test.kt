package com.ezero.connect

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class AndroidPushTokenRegistrationV1Test {
    @Test
    fun canonicalBytesMatchWorkerContractExactly() {
        val fp = "a".repeat(64)
        val issuedAt = "1795790000123"
        val nonce = "abcdefghijklmnopQRSTUV"
        val hash = "b".repeat(64)
        val expected = "EZERO_ANDROID_PUSH_TOKEN_V1\n" +
            "device_fp=$fp\n" +
            "issued_at=$issuedAt\n" +
            "nonce=$nonce\n" +
            "token_sha256=$hash\n"
        assertArrayEquals(
            expected.toByteArray(Charsets.UTF_8),
            AndroidPushTokenRegistrationV1.canonicalBytes(fp, issuedAt, nonce, hash)
        )
    }

    @Test
    fun rejectsMalformedTimestampAndNonce() {
        val fp = "a".repeat(64)
        val hash = "b".repeat(64)
        assertThrows(IllegalArgumentException::class.java) {
            AndroidPushTokenRegistrationV1.canonicalBytes(fp, "123", "abcdefghijklmnop", hash)
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidPushTokenRegistrationV1.canonicalBytes(fp, "1795790000123", "short", hash)
        }
    }
}
