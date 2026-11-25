package com.ezero.connect

import java.nio.charset.StandardCharsets
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class BrowserPermanentIdentityVerifierTest {
    @Test
    fun verifiesBrowserWebCryptoP256PermanentQrFormat() {
        val pair = KeyPairGenerator.getInstance("EC").apply {
            initialize(ECGenParameterSpec("secp256r1"))
        }.generateKeyPair()
        val spkiText = Base64.getUrlEncoder().withoutPadding().encodeToString(pair.public.encoded)
        val fingerprint = BrowserPermanentIdentityVerifier.sha256Hex(pair.public.encoded)
        val canonical = listOf(
            "EZERO-PERMANENT-IDENTITY-1", "https://coma39658-ctrl.github.io",
            spkiText, fingerprint
        ).joinToString("\n").toByteArray(StandardCharsets.UTF_8)
        val der = Signature.getInstance("SHA256withECDSA").run {
            initSign(pair.private); update(canonical); sign()
        }
        val proof = Base64.getUrlEncoder().withoutPadding().encodeToString(derToP1363(der))
        val verified = BrowserPermanentIdentityVerifier.verify("EZERO2.$spkiText.$fingerprint.$proof")
        assertEquals(fingerprint, verified.fingerprintSha256)
        assertEquals(spkiText, verified.publicKeySpkiBase64Url)
    }

    @Test
    fun rejectsTamperedFingerprintAndSignature() {
        val pair = KeyPairGenerator.getInstance("EC").apply {
            initialize(ECGenParameterSpec("secp256r1"))
        }.generateKeyPair()
        val spkiText = Base64.getUrlEncoder().withoutPadding().encodeToString(pair.public.encoded)
        val fingerprint = BrowserPermanentIdentityVerifier.sha256Hex(pair.public.encoded)
        val canonical = listOf(
            "EZERO-PERMANENT-IDENTITY-1", "https://coma39658-ctrl.github.io",
            spkiText, fingerprint
        ).joinToString("\n").toByteArray(StandardCharsets.UTF_8)
        val der = Signature.getInstance("SHA256withECDSA").run {
            initSign(pair.private); update(canonical); sign()
        }
        val proof = Base64.getUrlEncoder().withoutPadding().encodeToString(derToP1363(der))
        val replacement = if (proof[0] == 'A') 'B' else 'A'
        assertThrows(IllegalArgumentException::class.java) {
            BrowserPermanentIdentityVerifier.verify("EZERO2.$spkiText.${"0".repeat(64)}.$proof")
        }
        assertThrows(IllegalArgumentException::class.java) {
            BrowserPermanentIdentityVerifier.verify("EZERO2.$spkiText.$fingerprint.$replacement${proof.drop(1)}")
        }
    }

    private fun derToP1363(der: ByteArray): ByteArray {
        require(der.size >= 8 && der[0] == 0x30.toByte())
        var offset = 2
        require(der[offset++] == 0x02.toByte())
        val rLength = der[offset++].toInt() and 0xff
        val r = der.copyOfRange(offset, offset + rLength)
        offset += rLength
        require(der[offset++] == 0x02.toByte())
        val sLength = der[offset++].toInt() and 0xff
        val s = der.copyOfRange(offset, offset + sLength)
        fun fixed(value: ByteArray): ByteArray {
            val unsigned = if (value.size > 32 && value[0] == 0.toByte()) value.copyOfRange(1, value.size) else value
            require(unsigned.size <= 32)
            return ByteArray(32).also { System.arraycopy(unsigned, 0, it, 32 - unsigned.size, unsigned.size) }
        }
        return fixed(r) + fixed(s)
    }
}
