package com.ezero.connect

import org.json.JSONObject
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
        val json = JSONObject()
            .put("challenge", JSONObject()
                .put("challenge_id", challenge.challengeId)
                .put("device_fp", challenge.deviceFingerprint)
                .put("nonce", challenge.nonce)
                .put("audience", challenge.audience)
                .put("expires_at", challenge.expiresAt))
            .put("device_challenge", b64(canonical))
        assertEquals(challenge.challengeId, json.getJSONObject("challenge").getString("challenge_id"))
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentProtocolV1.canonicalChallenge(challenge.copy(audience = "https://attacker.example"))
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentProtocolV1.canonicalChallenge(challenge.copy(expiresAt = (now + 91_000L).toString()))
        }
    }

    @Test fun endpointMustBeHttpsWorkersDevOriginOnly() {
        assertThrows(Exception::class.java) { AndroidEnrollmentWorkerClientV1("http://example.workers.dev") }
        assertThrows(Exception::class.java) { AndroidEnrollmentWorkerClientV1("https://attacker.example") }
        assertThrows(Exception::class.java) { AndroidEnrollmentWorkerClientV1("https://good.workers.dev/path") }
        AndroidEnrollmentWorkerClientV1("https://ezero-test.workers.dev")
    }
}
