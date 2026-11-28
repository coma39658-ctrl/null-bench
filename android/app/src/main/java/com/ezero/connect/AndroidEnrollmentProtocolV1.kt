package com.ezero.connect

import java.nio.charset.StandardCharsets

/** Canonical byte contract shared with the isolated enrollment Worker candidate. */
internal object AndroidEnrollmentProtocolV1 {
    const val AUDIENCE = "https://coma39658-ctrl.github.io"
    private const val CHALLENGE_TAG = "EZERO_ANDROID_ENROLL_CHALLENGE_V1"

    data class Challenge(
        val challengeId: String,
        val deviceFingerprint: String,
        val nonce: String,
        val audience: String,
        val expiresAt: String
    )

    fun canonicalChallenge(challenge: Challenge): ByteArray {
        require(challenge.challengeId.matches(Regex("^[A-Za-z0-9_-]{16,128}$"))) { "BAD_CHALLENGE_ID" }
        require(challenge.deviceFingerprint.matches(Regex("^[a-f0-9]{64}$"))) { "BAD_DEVICE_FINGERPRINT" }
        require(challenge.nonce.matches(Regex("^[A-Za-z0-9_-]{16,128}$"))) { "BAD_NONCE" }
        require(challenge.audience == AUDIENCE) { "BAD_AUDIENCE" }
        val expiry = challenge.expiresAt.toLongOrNull() ?: throw IllegalArgumentException("BAD_EXPIRY")
        require(expiry > System.currentTimeMillis() && expiry <= System.currentTimeMillis() + 90_000L) { "CHALLENGE_EXPIRED" }
        val canonical = CHALLENGE_TAG + "\n" +
            "challenge_id=${challenge.challengeId}\n" +
            "device_fp=${challenge.deviceFingerprint}\n" +
            "nonce=${challenge.nonce}\n" +
            "audience=${challenge.audience}\n" +
            "expires_at=${challenge.expiresAt}\n"
        return canonical.toByteArray(StandardCharsets.UTF_8)
    }
}
