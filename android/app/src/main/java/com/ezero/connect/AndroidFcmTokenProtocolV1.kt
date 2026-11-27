package com.ezero.connect

import java.security.MessageDigest
import java.util.Base64

/** Canonical cross-platform format for device-authenticated FCM token updates. */
internal object AndroidFcmTokenProtocolV1 {
    const val AUDIENCE = "https://coma39658-ctrl.github.io"

    fun isValidToken(token: String): Boolean =
        token.matches(Regex("^[A-Za-z0-9_:-]{32,2048}$"))

    fun tokenSha256Base64Url(token: String): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(
            MessageDigest.getInstance("SHA-256").digest(token.toByteArray(Charsets.UTF_8))
        )

    fun canonicalMessage(
        deviceFingerprint: String,
        tokenSha256: String,
        commandId: String,
        issuedAt: String,
        nonce: String
    ): ByteArray = (
        "EZERO_ANDROID_FCM_TOKEN_V1\n" +
            "device_fp=$deviceFingerprint\n" +
            "token_sha256=$tokenSha256\n" +
            "command_id=$commandId\n" +
            "issued_at=$issuedAt\n" +
            "nonce=$nonce\n" +
            "audience=$AUDIENCE\n"
        ).toByteArray(Charsets.UTF_8)
}
