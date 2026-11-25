package com.ezero.connect

import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Test

class AndroidSignatureEncodingTest {
    @Test fun convertsJcaDerSignatureToWebCryptoP1363() {
        val pair = KeyPairGenerator.getInstance("EC").apply {
            initialize(ECGenParameterSpec("secp256r1"))
        }.generateKeyPair()
        val message = "E-ZERO root enrollment signature interoperability".toByteArray()
        val der = Signature.getInstance("SHA256withECDSA").run {
            initSign(pair.private); update(message); sign()
        }
        val p1363 = AndroidSignatureEncoding.derP256ToP1363(der)
        assertEquals(64, p1363.size)
        val roundTripDer = BrowserPermanentIdentityVerifier.p1363ToDer(p1363)
        val valid = Signature.getInstance("SHA256withECDSA").run {
            initVerify(pair.public); update(message); verify(roundTripDer)
        }
        assertTrue(valid)
    }

    @Test fun rejectsMalformedAndTrailingDer() {
        assertThrows(IllegalArgumentException::class.java) {
            AndroidSignatureEncoding.derP256ToP1363(byteArrayOf(0x30, 0))
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidSignatureEncoding.derP256ToP1363(byteArrayOf(0x30, 6, 2, 1, 1, 2, 1, 1, 0))
        }
    }
}
