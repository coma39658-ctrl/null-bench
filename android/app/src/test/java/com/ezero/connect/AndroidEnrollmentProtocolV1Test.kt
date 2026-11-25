package com.ezero.connect

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class AndroidEnrollmentProtocolV1Test {
    private fun validChallenge() = AndroidEnrollmentProtocolV1.Challenge(
        challengeId = "A".repeat(32),
        deviceFingerprint = "a".repeat(64),
        nonce = "B".repeat(32),
        audience = AndroidEnrollmentProtocolV1.AUDIENCE,
        expiresAt = (System.currentTimeMillis() + 60_000L).toString()
    )

    @Test
    fun canonicalChallengeUsesExactWorkerFieldOrderAndFinalLf() {
        val c = validChallenge()
        val expected = (
            "EZERO_ANDROID_ENROLL_CHALLENGE_V1\n" +
                "challenge_id=${c.challengeId}\n" +
                "device_fp=${c.deviceFingerprint}\n" +
                "nonce=${c.nonce}\n" +
                "audience=${c.audience}\n" +
                "expires_at=${c.expiresAt}\n"
            ).toByteArray(Charsets.UTF_8)
        assertArrayEquals(expected, AndroidEnrollmentProtocolV1.canonicalChallenge(c))
    }

    @Test
    fun rejectsWrongAudience() {
        val c = validChallenge().copy(audience = "https://attacker.invalid")
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentProtocolV1.canonicalChallenge(c)
        }
    }

    @Test
    fun rejectsExpiredChallenge() {
        val c = validChallenge().copy(expiresAt = (System.currentTimeMillis() - 1L).toString())
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentProtocolV1.canonicalChallenge(c)
        }
    }

    @Test
    fun rejectsChallengeWithWrongDeviceFingerprint() {
        val c = validChallenge().copy(deviceFingerprint = "A".repeat(64))
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentProtocolV1.canonicalChallenge(c)
        }
    }
}
