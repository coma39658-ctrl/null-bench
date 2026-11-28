package com.ezero.connect

import org.json.JSONObject
import java.nio.charset.StandardCharsets

/**
 * Strict local parser for the browser-to-Android identity proof QR.
 *
 * This validates shape, bounds, expiry and installation binding only. It does NOT
 * authenticate the browser signature, establish friendship, enroll the device,
 * or authorize calls. Those decisions belong to the private binding service.
 */
internal object BrowserAndroidIdentityProofQrV1 {
    private const val TYPE = "EZERO_BINDING_IDENTITY_PROOF_V1"
    private const val PROTOCOL = "EZERO_IDENTITY_INSTALLATION_BINDING_V1"
    private const val ORIGIN = "https://coma39658-ctrl.github.io"
    private const val MAX_QR_CHARS = 4096
    private const val MAX_FUTURE_MILLIS = 60_000L
    private val TOP_KEYS = setOf("type", "statement", "signature", "encoding")
    private val STATEMENT_KEYS = setOf(
        "protocol", "origin", "challengeId", "nonce", "expiresAt",
        "relationshipId", "identityFingerprint", "installationFingerprint", "installationId"
    )

    /**
     * Small recursive-descent JSON syntax validator. Object member names are decoded
     * before comparison, so escaped aliases such as "type" and "\\u0074ype" collide.
     * It validates strings, escapes, numbers, arrays, objects and trailing input.
     */
    private class StrictJsonDuplicateKeyGuard(private val source: String) {
        private var index = 0
        private val maxDepth = 32

        fun validateDocument() {
            skipWhitespace()
            parseValue(0)
            skipWhitespace()
            require(index == source.length) { "JSON_TRAILING_CONTENT" }
        }

        private fun parseValue(depth: Int) {
            skipWhitespace()
            require(depth <= maxDepth) { "JSON_NESTING_TOO_DEEP" }
            require(index < source.length) { "JSON_VALUE_MISSING" }
            when (source[index]) {
                '{' -> {
                    require(depth < maxDepth) { "JSON_NESTING_TOO_DEEP" }
                    parseObject(depth + 1)
                }
                '[' -> {
                    require(depth < maxDepth) { "JSON_NESTING_TOO_DEEP" }
                    parseArray(depth + 1)
                }
                '"' -> parseString()
                't' -> consumeLiteral("true")
                'f' -> consumeLiteral("false")
                'n' -> consumeLiteral("null")
                '-', in '0'..'9' -> parseNumber()
                else -> throw IllegalArgumentException("JSON_VALUE_INVALID")
            }
        }

        private fun parseObject(depth: Int) {
            expect('{')
            skipWhitespace()
            if (consumeIf('}')) return
            val keys = HashSet<String>()
            while (true) {
                skipWhitespace()
                require(index < source.length && source[index] == '"') { "JSON_OBJECT_KEY_INVALID" }
                val key = parseString()
                require(keys.add(key)) { "JSON_DUPLICATE_KEY" }
                skipWhitespace()
                expect(':')
                parseValue(depth)
                skipWhitespace()
                if (consumeIf('}')) return
                expect(',')
            }
        }

        private fun parseArray(depth: Int) {
            expect('[')
            skipWhitespace()
            if (consumeIf(']')) return
            while (true) {
                parseValue(depth)
                skipWhitespace()
                if (consumeIf(']')) return
                expect(',')
            }
        }

        private fun parseString(): String {
            expect('"')
            val out = StringBuilder()
            while (index < source.length) {
                val ch = source[index++]
                when {
                    ch == '"' -> return out.toString()
                    ch == '\\' -> {
                        require(index < source.length) { "JSON_ESCAPE_INVALID" }
                        when (val escaped = source[index++]) {
                            '"', '\\', '/' -> out.append(escaped)
                            'b' -> out.append('\b')
                            'f' -> out.append('\u000C')
                            'n' -> out.append('\n')
                            'r' -> out.append('\r')
                            't' -> out.append('\t')
                            'u' -> {
                                require(index + 4 <= source.length) { "JSON_UNICODE_ESCAPE_INVALID" }
                                val hex = source.substring(index, index + 4)
                                require(hex.all { it in '0'..'9' || it in 'a'..'f' || it in 'A'..'F' }) {
                                    "JSON_UNICODE_ESCAPE_INVALID"
                                }
                                out.append(hex.toInt(16).toChar())
                                index += 4
                            }
                            else -> throw IllegalArgumentException("JSON_ESCAPE_INVALID")
                        }
                    }
                    ch.code < 0x20 -> throw IllegalArgumentException("JSON_CONTROL_CHARACTER")
                    else -> out.append(ch)
                }
            }
            throw IllegalArgumentException("JSON_STRING_UNTERMINATED")
        }

        private fun parseNumber() {
            consumeIf('-')
            require(index < source.length) { "JSON_NUMBER_INVALID" }
            if (consumeIf('0')) {
                require(index >= source.length || source[index] !in '0'..'9') { "JSON_NUMBER_INVALID" }
            } else {
                require(index < source.length && source[index] in '1'..'9') { "JSON_NUMBER_INVALID" }
                while (index < source.length && source[index] in '0'..'9') index++
            }
            if (consumeIf('.')) {
                require(index < source.length && source[index] in '0'..'9') { "JSON_NUMBER_INVALID" }
                while (index < source.length && source[index] in '0'..'9') index++
            }
            if (index < source.length && (source[index] == 'e' || source[index] == 'E')) {
                index++
                if (index < source.length && (source[index] == '+' || source[index] == '-')) index++
                require(index < source.length && source[index] in '0'..'9') { "JSON_NUMBER_INVALID" }
                while (index < source.length && source[index] in '0'..'9') index++
            }
        }

        private fun consumeLiteral(literal: String) {
            require(source.regionMatches(index, literal, 0, literal.length)) { "JSON_LITERAL_INVALID" }
            index += literal.length
        }

        private fun skipWhitespace() {
            while (index < source.length && source[index] in charArrayOf(' ', '\t', '\n', '\r')) index++
        }

        private fun expect(ch: Char) {
            require(index < source.length && source[index] == ch) { "JSON_SYNTAX_INVALID" }
            index++
        }

        private fun consumeIf(ch: Char): Boolean {
            if (index < source.length && source[index] == ch) {
                index++
                return true
            }
            return false
        }

        companion object {
            fun validate(source: String) = StrictJsonDuplicateKeyGuard(source).validateDocument()
        }
    }

    data class Proof(
        val challengeId: String,
        val nonce: String,
        val expiresAt: Long,
        val relationshipId: String,
        val identityFingerprint: String,
        val installationFingerprint: String,
        val installationId: String,
        val signatureP1363: ByteArray,
        val canonicalBytes: ByteArray
    )

    fun decode(raw: String, expectedInstallationFingerprint: String, expectedInstallationId: String, nowMillis: Long = System.currentTimeMillis()): Proof {
        require(raw.isNotEmpty() && raw.length <= MAX_QR_CHARS) { "QR_SIZE_INVALID" }
        require(expectedInstallationFingerprint.matches(Regex("^[a-f0-9]{64}$"))) { "LOCAL_INSTALLATION_FINGERPRINT_INVALID" }
        require(expectedInstallationId.matches(Regex("^[A-Za-z0-9_-]{8,128}$"))) { "LOCAL_INSTALLATION_ID_INVALID" }

        // JSONObject keeps only the last occurrence of a duplicate key. Reject duplicates
        // with a strict syntax pass before constructing the object model.
        StrictJsonDuplicateKeyGuard.validate(raw)
        val root = JSONObject(raw)
        require(root.keys().asSequence().toSet() == TOP_KEYS) { "QR_FIELDS_INVALID" }
        require(root.getString("type") == TYPE) { "QR_TYPE_INVALID" }
        require(root.getString("encoding") == "P1363_BASE64URL") { "SIGNATURE_ENCODING_INVALID" }

        val statement = root.getJSONObject("statement")
        require(statement.keys().asSequence().toSet() == STATEMENT_KEYS) { "STATEMENT_FIELDS_INVALID" }
        require(statement.getString("protocol") == PROTOCOL) { "PROTOCOL_INVALID" }
        require(statement.getString("origin") == ORIGIN) { "ORIGIN_INVALID" }

        val challengeId = statement.getString("challengeId")
        val nonce = statement.getString("nonce")
        val expiresText = statement.getString("expiresAt")
        val relationshipId = statement.getString("relationshipId")
        val identityFingerprint = statement.getString("identityFingerprint")
        val installationFingerprint = statement.getString("installationFingerprint")
        val installationId = statement.getString("installationId")
        val signatureText = root.getString("signature")

        require(challengeId.matches(Regex("^[A-Za-z0-9_-]{16,128}$"))) { "CHALLENGE_ID_INVALID" }
        require(nonce.matches(Regex("^[A-Za-z0-9_-]{22,128}$"))) { "NONCE_INVALID" }
        require(expiresText.matches(Regex("^[0-9]{13}$"))) { "EXPIRY_FORMAT_INVALID" }
        val expiresAt = expiresText.toLong()
        require(expiresAt > nowMillis && expiresAt - nowMillis <= MAX_FUTURE_MILLIS) { "CHALLENGE_EXPIRED_OR_TOO_LONG" }
        require(relationshipId.matches(Regex("^[a-f0-9]{64}$"))) { "RELATIONSHIP_ID_INVALID" }
        require(identityFingerprint.matches(Regex("^([A-F0-9]{2}:){31}[A-F0-9]{2}$"))) { "IDENTITY_FINGERPRINT_INVALID" }
        require(installationFingerprint.matches(Regex("^[a-f0-9]{64}$"))) { "INSTALLATION_FINGERPRINT_INVALID" }
        require(installationId.matches(Regex("^[A-Za-z0-9_-]{8,128}$"))) { "INSTALLATION_ID_INVALID" }
        require(installationFingerprint == expectedInstallationFingerprint && installationId == expectedInstallationId) {
            "QR_FOR_DIFFERENT_INSTALLATION"
        }

        val signature = BrowserPermanentIdentityVerifier.decodeBase64Url(signatureText)
        require(signature.size == 64) { "SIGNATURE_SIZE_INVALID" }

        // Canonical V1 byte sequence: UTF-8, exact field order, LF separators, no trailing LF.
        val canonical = listOf(
            PROTOCOL, ORIGIN, challengeId, nonce, expiresText, relationshipId,
            identityFingerprint, installationFingerprint, installationId
        ).joinToString("\n").toByteArray(StandardCharsets.UTF_8)

        return Proof(
            challengeId, nonce, expiresAt, relationshipId, identityFingerprint,
            installationFingerprint, installationId, signature, canonical
        )
    }
}
