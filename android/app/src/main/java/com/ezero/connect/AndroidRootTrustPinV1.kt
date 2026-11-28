package com.ezero.connect

import android.content.Context
import java.util.Base64
import java.security.AlgorithmParameters
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.X509EncodedKeySpec

/**
 * First-use Root pinning gate. The confirmation fingerprint MUST be compared
 * with the Root fingerprint over an independent channel before calling pin().
 * This class does not discover or establish the user's Root identity.
 */
internal object AndroidRootTrustPinV1 {
    private const val PREFS = "ezero_root_trust_v1"
    private const val KEY_SPKI = "root_spki_b64url"
    private const val KEY_FP = "root_fingerprint"

    data class Pin(val spkiBase64Url: String, val fingerprint: String)

    fun validateCandidate(spkiBase64Url: String, displayedFingerprint: String): Pin {
        require(displayedFingerprint.matches(Regex("^[a-f0-9]{64}$"))) { "ROOT_FINGERPRINT_INVALID" }
        require(spkiBase64Url.matches(Regex("^[A-Za-z0-9_-]+$")) && spkiBase64Url.length % 4 != 1) {
            "ROOT_SPKI_BASE64URL_INVALID"
        }
        val spki = Base64.getUrlDecoder().decode(spkiBase64Url)
        require(Base64.getUrlEncoder().withoutPadding().encodeToString(spki) == spkiBase64Url) {
            "ROOT_SPKI_BASE64URL_NON_CANONICAL"
        }
        require(spki.size in 80..160) { "ROOT_SPKI_SIZE_INVALID" }
        val key = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(spki)) as? ECPublicKey
            ?: throw IllegalArgumentException("ROOT_PUBLIC_KEY_INVALID")
        val p256 = AlgorithmParameters.getInstance("EC").apply {
            init(ECGenParameterSpec("secp256r1"))
        }.getParameterSpec(ECParameterSpec::class.java)
        require(key.params.curve == p256.curve && key.params.generator == p256.generator &&
            key.params.order == p256.order && key.params.cofactor == p256.cofactor) { "ROOT_KEY_NOT_P256" }
        val actual = MessageDigest.getInstance("SHA-256").digest(spki)
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }
        require(actual == displayedFingerprint) { "ROOT_FINGERPRINT_MISMATCH" }
        return Pin(spkiBase64Url, actual)
    }

    fun pinAfterIndependentConfirmation(
        context: Context,
        spkiBase64Url: String,
        displayedFingerprint: String,
        independentlyConfirmedFingerprint: String
    ): Pin {
        require(independentlyConfirmedFingerprint.matches(Regex("^[a-f0-9]{64}$")) &&
            independentlyConfirmedFingerprint == displayedFingerprint) {
            "INDEPENDENT_ROOT_CONFIRMATION_REQUIRED"
        }
        val candidate = validateCandidate(spkiBase64Url, displayedFingerprint)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_SPKI, candidate.spkiBase64Url)
            .putString(KEY_FP, candidate.fingerprint)
            .commit().also { require(it) { "ROOT_PIN_PERSISTENCE_FAILED" } }
        return candidate
    }

    fun load(context: Context): Pin? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val spki = prefs.getString(KEY_SPKI, null) ?: return null
        val fp = prefs.getString(KEY_FP, null) ?: throw IllegalStateException("ROOT_PIN_INCOMPLETE")
        return validateCandidate(spki, fp)
    }
}
