package com.ezero.connect

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.security.MessageDigest
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

    /** Sign protocol-defined UTF-8 bytes with the non-exportable installation key. */
    fun signCanonicalBytes(bytes: ByteArray): ByteArray {
        require(bytes.isNotEmpty() && bytes.size <= 8192) { "SIGNING_MESSAGE_SIZE_INVALID" }
        val pair = getOrCreateKeyPair()
        return Signature.getInstance("SHA256withECDSA").run {
            initSign(pair.private)
            update(bytes)
            sign() // ASN.1 DER, as required by the Worker registration contract.
        }
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
