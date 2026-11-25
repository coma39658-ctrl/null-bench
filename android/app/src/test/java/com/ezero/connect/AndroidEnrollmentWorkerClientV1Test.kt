package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.util.Base64

class AndroidEnrollmentWorkerClientV1Test {
    private fun b64(bytes: ByteArray) = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    @Test fun acceptsOnlyExactCanonicalWorkerChallengeBytes() {
        val now = System.currentTimeMillis()
        val challenge = AndroidEnrollmentProtocolV1.Challenge(
            "C".repeat(32), "a".repeat(64), "N".repeat(32),
            AndroidEnrollmentProtocolV1.AUDIENCE, (now + 60_000L).toString()
        )
        val canonical = AndroidEnrollmentProtocolV1.canonicalChallenge(challenge)
        val accepted = AndroidEnrollmentWorkerClientV1.validateChallengePayload(
            challenge, challenge.deviceFingerprint, b64(canonical)
        )
        assertEquals(challenge.challengeId, accepted.challenge.challengeId)
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentWorkerClientV1.validateChallengePayload(
                challenge, "b".repeat(64), b64(canonical)
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentWorkerClientV1.validateChallengePayload(
                challenge, challenge.deviceFingerprint, b64("tampered".toByteArray())
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentWorkerClientV1.validateChallengePayload(
                challenge.copy(audience = "https://attacker.example"),
                challenge.deviceFingerprint, b64(canonical)
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentWorkerClientV1.validateChallengePayload(
                challenge.copy(expiresAt = (now + 91_000L).toString()),
                challenge.deviceFingerprint, b64(canonical)
            )
        }
    }

    @Test fun endpointMustBeHttpsWorkersDevOriginOnly() {
        assertThrows(Exception::class.java) { AndroidEnrollmentWorkerClientV1("http://example.workers.dev") }
        assertThrows(Exception::class.java) { AndroidEnrollmentWorkerClientV1("https://attacker.example") }
        assertThrows(Exception::class.java) { AndroidEnrollmentWorkerClientV1("https://good.workers.dev/path") }
        AndroidEnrollmentWorkerClientV1("https://ezero-test.workers.dev")
    }
}
