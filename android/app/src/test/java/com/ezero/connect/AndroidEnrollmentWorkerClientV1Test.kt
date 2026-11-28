package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.util.Base64
import java.security.KeyPairGenerator
import java.security.spec.ECGenParameterSpec
import java.security.MessageDigest

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

    @Test fun signedRequestQrBindsKeystorePublicIdentityToWorkerChallenge() {
        val generator = KeyPairGenerator.getInstance("EC")
        generator.initialize(ECGenParameterSpec("secp256r1"))
        val pair = generator.generateKeyPair()
        val spki = pair.public.encoded
        val fp = MessageDigest.getInstance("SHA-256").digest(spki)
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }
        val identity = AndroidEnrollmentKeyStore.PublicIdentity(fp, b64(spki))
        val challenge = AndroidEnrollmentProtocolV1.Challenge(
            "C".repeat(32), fp, "N".repeat(32),
            AndroidEnrollmentProtocolV1.AUDIENCE, (System.currentTimeMillis() + 60_000L).toString()
        )
        val qr = AndroidEnrollmentWorkerClientV1.encodeSignedRequest(
            identity, challenge, b64(ByteArray(64) { 7 })
        )
        val decoded = AndroidEnrollmentQrEnvelopeV1.decodeRequest(qr)
        assertEquals(fp, decoded.deviceFp)
        assertEquals(challenge.challengeId, decoded.challengeId)
        assertEquals(identity.publicKeySpkiBase64Url, decoded.deviceSpki)
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentWorkerClientV1.encodeSignedRequest(
                identity, challenge.copy(deviceFingerprint = "b".repeat(64)), b64(ByteArray(64) { 7 })
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
