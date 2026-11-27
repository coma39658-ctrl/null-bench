package com.ezero.connect

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.security.MessageDigest
import java.security.SecureRandom
import android.util.Base64

/**
 * Per-install P-256 identity for root-approved Android enrollment.
 * The private key is generated and retained inside Android Keystore; it is never exported.
 */
internal object AndroidEnrollmentKeyStore {
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val ALIAS = "ezero_android_enrollment_p256_v1"

    data class PublicIdentity(
        val fingerprint: String,
        val publicKeySpkiBase64Url: String
    )

    private fun keyStore(): KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

    private fun getOrCreateKeyPair(): KeyPair {
        val store = keyStore()
        val existing = store.getKey(ALIAS, null)
        if (existing != null) {
            val certificate = store.getCertificate(ALIAS) ?: throw IllegalStateException("KEY_CERTIFICATE_MISSING")
            return KeyPair(certificate.publicKey, certificate.publicKey.let { existing as java.security.PrivateKey })
        }
        val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, ANDROID_KEYSTORE)
        generator.initialize(
            KeyGenParameterSpec.Builder(
                ALIAS,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
            )
                .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setUserAuthenticationRequired(false)
                .build()
        )
        return generator.generateKeyPair()
    }

    fun getOrCreatePublicIdentity(): PublicIdentity {
        val pair = getOrCreateKeyPair()
        require(pair.private.encoded == null) { "PRIVATE_KEY_MUST_NOT_BE_EXPORTABLE" }
        val spki = pair.public.encoded
        val fingerprint = MessageDigest.getInstance("SHA-256").digest(spki)
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }
        return PublicIdentity(fingerprint, Base64.encodeToString(spki, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING))
    }

    data class SignedFcmTokenRegistration(
        val deviceFingerprint: String,
        val fcmToken: String,
        val issuedAt: String,
        val commandId: String,
        val nonce: String,
        val signature: String
    )

    fun signFcmTokenRegistration(fcmToken: String): SignedFcmTokenRegistration {
        require(AndroidFcmTokenProtocolV1.isValidToken(fcmToken)) {
            "FCM_TOKEN_FORMAT_INVALID"
        }
        val identity = getOrCreatePublicIdentity()
        val random = SecureRandom()
        fun randomB64(): String {
            val bytes = ByteArray(24)
            random.nextBytes(bytes)
            return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        }
        val tokenHash = AndroidFcmTokenProtocolV1.tokenSha256Base64Url(fcmToken)
        val commandId = randomB64()
        val issuedAt = System.currentTimeMillis().toString()
        val nonce = randomB64()
        val canonical = AndroidFcmTokenProtocolV1.canonicalMessage(
            identity.fingerprint, tokenHash, commandId, issuedAt, nonce
        )
        val pair = getOrCreateKeyPair()
        val der = Signature.getInstance("SHA256withECDSA").run {
            initSign(pair.private)
            update(canonical)
            sign()
        }
        val p1363 = AndroidSignatureEncoding.derP256ToP1363(der)
        return SignedFcmTokenRegistration(
            identity.fingerprint, fcmToken, issuedAt, commandId, nonce,
            Base64.encodeToString(p1363, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        )
    }

    fun signChallenge(challenge: AndroidEnrollmentProtocolV1.Challenge): String {
        val pair = getOrCreateKeyPair()
        val identity = getOrCreatePublicIdentity()
        require(identity.fingerprint == challenge.deviceFingerprint) { "CHALLENGE_DEVICE_MISMATCH" }
        val signature = Signature.getInstance("SHA256withECDSA").run {
            initSign(pair.private)
            update(AndroidEnrollmentProtocolV1.canonicalChallenge(challenge))
            sign()
        }
        val p1363 = AndroidSignatureEncoding.derP256ToP1363(signature)
        return Base64.encodeToString(p1363, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }
}
