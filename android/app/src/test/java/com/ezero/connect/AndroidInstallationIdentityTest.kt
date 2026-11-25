package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Test

class AndroidInstallationIdentityTest {
    @Test
    fun fingerprintUsesLowercaseSha256HexOfEncodedPublicKey() {
        val fingerprint = AndroidInstallationIdentity.fingerprintOf("abc".toByteArray())
        assertEquals(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            fingerprint
        )
    }

    @Test
    fun fingerprintIsDeterministicForSamePublicKeyBytes() {
        val keyBytes = byteArrayOf(0, 1, 2, 127, -1)
        assertEquals(
            AndroidInstallationIdentity.fingerprintOf(keyBytes),
            AndroidInstallationIdentity.fingerprintOf(keyBytes.copyOf())
        )
    }
}
