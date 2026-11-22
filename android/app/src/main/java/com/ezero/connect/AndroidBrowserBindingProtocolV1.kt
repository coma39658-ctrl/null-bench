package com.ezero.connect

import java.io.ByteArrayOutputStream
import java.math.BigInteger
import java.nio.charset.StandardCharsets

/**
 * Pure protocol primitives for the proposed EZERO-ANDROID-BIND-1 handshake.
 *
 * This helper is intentionally NOT called by the app UI, QR scanner, contact
 * store, or network layer. It is groundwork for shared cross-platform tests;
 * it does not enroll or trust a device.
 */
internal object AndroidBrowserBindingProtocolV1 {
    private const val PROTOCOL = "EZERO-ANDROID-BIND-1"
    private const val EXPECTED_ORIGIN = "https://coma39658-ctrl.github.io"
    private const val CAPABILITY = "call-invite-only"
    private const val P256_COMPONENT_BYTES = 32
    private const val MAX_VALIDITY_SECONDS = 90L

    data class RequestFields(
        val origin: String,
        val ownerFingerprint: String,
        val androidPublicKeySpkiBase64Url: String,
        val androidFingerprint: String,
        val nonceBase64Url: String,
        val issuedAtEpochSeconds: Long,
        val expiresAtEpochSeconds: Long
    )

    /**
     * Canonical UTF-8 representation. Every field is a single line; values
     * with separators/control characters are rejected rather than escaped.
     */
    fun canonicalRequest(fields: RequestFields): ByteArray {
        require(fields.origin == EXPECTED_ORIGIN) { "Unexpected binding origin" }
        requireSingleLine(fields.origin, "origin")
        requireFingerprint(fields.ownerFingerprint, "owner fingerprint")
        requireBase64Url(fields.androidPublicKeySpkiBase64Url, "Android SPKI")
        requireFingerprint(fields.androidFingerprint, "Android fingerprint")
        requireBase64Url(fields.nonceBase64Url, "nonce")
        require(fields.issuedAtEpochSeconds >= 0L) { "Invalid issued-at time" }
        require(fields.expiresAtEpochSeconds > fields.issuedAtEpochSeconds) { "Invalid expiry" }
        require(fields.expiresAtEpochSeconds - fields.issuedAtEpochSeconds <= MAX_VALIDITY_SECONDS) {
            "Challenge validity exceeds 90 seconds"
        }

        val lines = listOf(
            PROTOCOL,
            fields.origin,
            fields.ownerFingerprint,
            fields.androidPublicKeySpkiBase64Url,
            fields.androidFingerprint,
            fields.nonceBase64Url,
            fields.issuedAtEpochSeconds.toString(),
            fields.expiresAtEpochSeconds.toString(),
            CAPABILITY
        )
        return lines.joinToString("\n").toByteArray(StandardCharsets.UTF_8)
    }

    /** Convert a strict ASN.1 DER ECDSA signature to WebCrypto P1363 (r || s). */
    fun derToP1363(der: ByteArray): ByteArray {
        val cursor = DerCursor(der)
        require(cursor.readByte() == 0x30) { "ECDSA signature must be a DER sequence" }
        val sequenceLength = cursor.readLength()
        require(sequenceLength == cursor.remaining()) { "Invalid DER sequence length" }
        val r = cursor.readInteger()
        val s = cursor.readInteger()
        require(cursor.remaining() == 0) { "Trailing DER signature bytes" }
        return toFixedUnsigned(r) + toFixedUnsigned(s)
    }

    /** Convert WebCrypto P1363 (r || s) into the DER form used by JCA Signature. */
    fun p1363ToDer(p1363: ByteArray): ByteArray {
        require(p1363.size == P256_COMPONENT_BYTES * 2) { "P1363 signature must be 64 bytes" }
        val r = BigInteger(1, p1363.copyOfRange(0, P256_COMPONENT_BYTES))
        val s = BigInteger(1, p1363.copyOfRange(P256_COMPONENT_BYTES, P256_COMPONENT_BYTES * 2))
        require(r.signum() > 0 && s.signum() > 0) { "ECDSA components must be positive" }
        val rDer = derInteger(r)
        val sDer = derInteger(s)
        val body = rDer + sDer
        return byteArrayOf(0x30, body.size.toByte()) + body
    }

    private fun derInteger(value: BigInteger): ByteArray {
        val bytes = value.toByteArray()
        require(bytes.size <= P256_COMPONENT_BYTES + 1) { "ECDSA component too large" }
        return byteArrayOf(0x02, bytes.size.toByte()) + bytes
    }

    private fun toFixedUnsigned(value: ByteArray): ByteArray {
        require(value.isNotEmpty()) { "Empty ECDSA component" }
        require(value[0].toInt() and 0x80 == 0) { "Negative DER integer" }
        require(!(value.size > 1 && value[0] == 0.toByte() && value[1].toInt() and 0x80 == 0)) {
            "Non-minimal DER integer"
        }
        val unsigned = if (value[0] == 0.toByte()) value.copyOfRange(1, value.size) else value
        require(unsigned.isNotEmpty() && unsigned.size <= P256_COMPONENT_BYTES) {
            "ECDSA component outside P-256 width"
        }
        return ByteArray(P256_COMPONENT_BYTES).also {
            System.arraycopy(unsigned, 0, it, P256_COMPONENT_BYTES - unsigned.size, unsigned.size)
        }
    }

    private fun requireFingerprint(value: String, label: String) {
        require(Regex("^[0-9a-f]{64}$").matches(value)) { "Invalid $label" }
    }

    private fun requireBase64Url(value: String, label: String) {
        require(value.isNotEmpty() && Regex("^[A-Za-z0-9_-]+$").matches(value)) {
            "Invalid $label encoding"
        }
    }

    private fun requireSingleLine(value: String, label: String) {
        require(value.isNotEmpty() && value.none { it == '\n' || it == '\r' || it.code < 0x20 }) {
            "Invalid $label"
        }
    }

    private class DerCursor(private val bytes: ByteArray) {
        private var offset = 0
        fun remaining(): Int = bytes.size - offset

        fun readByte(): Int {
            require(offset < bytes.size) { "Truncated DER signature" }
            return bytes[offset++].toInt() and 0xff
        }

        fun readLength(): Int {
            val first = readByte()
            if (first < 0x80) return first
            val count = first and 0x7f
            require(count in 1..2) { "Unsupported DER length" }
            require(count <= remaining()) { "Truncated DER length" }
            require(readByte() != 0) { "Non-minimal DER length" }
            var length = 0
            repeat(count) { length = (length shl 8) or readByte() }
            require(length >= 0x80) { "Non-minimal DER length" }
            return length
        }

        fun readInteger(): ByteArray {
            require(readByte() == 0x02) { "Expected DER integer" }
            val length = readLength()
            require(length in 1..(P256_COMPONENT_BYTES + 1) && length <= remaining()) {
                "Invalid DER integer length"
            }
            return bytes.copyOfRange(offset, offset + length).also { offset += length }
        }
    }
}
