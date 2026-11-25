package com.ezero.connect

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec

/**
 * Per-installation P-256 signing identity.
 *
 * The private key is generated and retained by Android Keystore and is never
 * returned to callers or serialized. This is local key groundwork only:
 * it does not enroll the device, authenticate a user, or contact a server.
 */
internal object AndroidInstallationIdentity {
    private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
    private const val KEY_ALIAS = "com.ezero.connect.installation-signing-v1"
    private const val CURVE = "secp256r1"
    private const val MAX_SIGNED_MESSAGE_BYTES = 16 * 1024

    data class PublicIdentity(
        val publicKeySpkiBase64: String,
        val fingerprintSha256: String
    )

    @Synchronized
    fun getOrCreatePublicIdentity(): PublicIdentity {
        val keyStore = loadKeyStore()
        if (!keyStore.containsAlias(KEY_ALIAS)) {
            val generator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC,
                KEYSTORE_PROVIDER
            )
            generator.initialize(
                KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
                )
                    .setAlgorithmParameterSpec(ECGenParameterSpec(CURVE))
                    .setDigests(KeyProperties.DIGEST_SHA256)
                    .setUserAuthenticationRequired(false)
                    .build()
            )
            generator.generateKeyPair()
        }

        val publicKey = keyStore.getCertificate(KEY_ALIAS)?.publicKey
            ?: error("Android installation public key is unavailable")
        val encoded = publicKey.encoded
            ?: error("Android installation public key encoding is unavailable")

        return PublicIdentity(
            publicKeySpkiBase64 = Base64.encodeToString(encoded, Base64.NO_WRAP),
            fingerprintSha256 = fingerprintOf(encoded)
        )
    }

    /**
     * Signs a server challenge or protocol-defined canonical message.
     * The caller is responsible for validating challenge origin, audience,
     * nonce and expiry before signing. This method never sends the signature.
     */
    @Synchronized
    fun sign(canonicalMessage: ByteArray): ByteArray {
        require(canonicalMessage.isNotEmpty()) { "Message must not be empty" }
        require(canonicalMessage.size <= MAX_SIGNED_MESSAGE_BYTES) { "Message is too large" }

        val keyStore = loadKeyStore()
        val privateKey = keyStore.getKey(KEY_ALIAS, null) as? PrivateKey
            ?: error("Android installation signing key is not enrolled on this device")
        return Signature.getInstance("SHA256withECDSA").run {
            initSign(privateKey)
            update(canonicalMessage)
            sign()
        }
    }

    private fun loadKeyStore(): KeyStore =
        KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }

    internal fun fingerprintOf(publicKeySpki: ByteArray): String =
        MessageDigest.getInstance("SHA-256")
            .digest(publicKeySpki)
            .joinToString("") { byte -> "%02x".format(byte.toInt() and 0xff) }
}
