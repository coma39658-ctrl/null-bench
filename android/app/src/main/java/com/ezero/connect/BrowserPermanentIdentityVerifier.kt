package com.ezero.connect

import java.io.ByteArrayOutputStream
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.Signature
import java.security.interfaces.ECPublicKey
import java.security.spec.X509EncodedKeySpec

/** Verifies the existing browser EZERO2 QR signature; does not enroll or trust a device. */
internal object BrowserPermanentIdentityVerifier {
    private const val IDENTITY_ORIGIN = "https://coma39658-ctrl.github.io"
    private const val DOMAIN = "EZERO-PERMANENT-IDENTITY-1"
    private const val MAX_TOKEN_LENGTH = 600
    private const val P1363_SIGNATURE_BYTES = 64

    data class VerifiedIdentity(val fingerprintSha256: String, val publicKeySpkiBase64Url: String)

    fun verify(token: String): VerifiedIdentity {
        require(token.isNotEmpty() && token.length <= MAX_TOKEN_LENGTH) { "BAD_ID" }
        val parts = token.split('.')
        require(parts.size == 4 && parts[0] == "EZERO2") { "BAD_ID" }
        val spkiText = parts[1]
        val fingerprint = parts[2]
        val proofText = parts[3]
        require(spkiText.matches(Regex("^[A-Za-z0-9_-]{50,240}$"))) { "BAD_KEY" }
        require(fingerprint.matches(Regex("^[a-f0-9]{64}$"))) { "BAD_FINGERPRINT" }
        require(proofText.matches(Regex("^[A-Za-z0-9_-]{80,120}$"))) { "BAD_SIGNATURE" }

        val spki = decodeBase64Url(spkiText)
        require(spki.isNotEmpty() && spki.size <= 180) { "BAD_KEY_SIZE" }
        val calculated = sha256Hex(spki)
        require(calculated == fingerprint) { "FINGERPRINT_MISMATCH" }

        val publicKey = KeyFactory.getInstance("EC")
            .generatePublic(X509EncodedKeySpec(spki)) as? ECPublicKey
            ?: throw IllegalArgumentException("BAD_PUBLIC_KEY")
        require(publicKey.params.curve.field.fieldSize == 256) { "UNSUPPORTED_CURVE" }

        val rawSignature = decodeBase64Url(proofText)
        require(rawSignature.size == P1363_SIGNATURE_BYTES) { "BAD_SIGNATURE_SIZE" }
        val canonical = listOf(DOMAIN, IDENTITY_ORIGIN, spkiText, fingerprint)
            .joinToString("\n").toByteArray(StandardCharsets.UTF_8)
        val valid = Signature.getInstance("SHA256withECDSA").run {
            initVerify(publicKey)
            update(canonical)
            verify(p1363ToDer(rawSignature))
        }
        require(valid) { "BAD_PERMANENT_SIGNATURE" }
        return VerifiedIdentity(fingerprint, spkiText)
    }

    internal fun sha256Hex(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes)
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }

    /** Strict unpadded base64url decoder; compatible with Android API 24+. */
    internal fun decodeBase64Url(value: String): ByteArray {
        require(value.isNotEmpty() && value.none { it == '=' }) { "BAD_BASE64URL" }
        require(value.length % 4 != 1) { "BAD_BASE64URL_LENGTH" }
        val alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
        val out = ByteArrayOutputStream(value.length * 3 / 4)
        var buffer = 0
        var bits = 0
        for (ch in value) {
            val digit = alphabet.indexOf(ch)
            require(digit >= 0) { "BAD_BASE64URL_CHAR" }
            buffer = (buffer shl 6) or digit
            bits += 6
            if (bits >= 8) {
                bits -= 8
                out.write((buffer shr bits) and 0xff)
            }
        }
        if (bits > 0) require((buffer and ((1 shl bits) - 1)) == 0) { "NON_CANONICAL_BASE64URL" }
        return out.toByteArray()
    }

    /** Convert WebCrypto's 64-byte P1363 signature to JCA ASN.1 DER. */
    internal fun p1363ToDer(raw: ByteArray): ByteArray {
        require(raw.size == P1363_SIGNATURE_BYTES) { "BAD_SIGNATURE_SIZE" }
        fun integer(offset: Int): ByteArray {
            var start = offset
            val end = offset + 32
            while (start < end - 1 && raw[start].toInt() == 0) start++
            val prefix = raw[start].toInt() and 0x80 != 0
            val length = end - start + if (prefix) 1 else 0
            val result = ByteArray(length + 2)
            result[0] = 0x02
            result[1] = length.toByte()
            var target = 2
            if (prefix) result[target++] = 0
            System.arraycopy(raw, start, result, target, end - start)
            return result
        }
        val r = integer(0)
        val s = integer(32)
        val bodyLength = r.size + s.size
        require(bodyLength < 128) { "SIGNATURE_TOO_LARGE" }
        return byteArrayOf(0x30, bodyLength.toByte()) + r + s
    }
}
