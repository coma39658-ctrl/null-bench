package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class AndroidEnrollmentQrEnvelopeV1Test {
    private val keyPair by lazy {
        java.security.KeyPairGenerator.getInstance("EC").apply {
            initialize(java.security.spec.ECGenParameterSpec("secp256r1"))
        }.generateKeyPair()
    }
    private val deviceFp by lazy {
        java.security.MessageDigest.getInstance("SHA-256").digest(keyPair.public.encoded)
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }
    }
    private fun b64(size: Int) = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(size) { (it + 1).toByte() })
    private fun b64From(bytes: ByteArray) = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    private fun request() = AndroidEnrollmentQrEnvelopeV1.Request(
        b64From(keyPair.public.encoded), deviceFp, "A".repeat(32), "B".repeat(32),
        AndroidEnrollmentProtocolV1.AUDIENCE, (System.currentTimeMillis() + 60_000L).toString(), b64(64)
    )
    private fun approval() = AndroidEnrollmentQrEnvelopeV1.Approval(
        "c".repeat(64), deviceFp, "A".repeat(32), "B".repeat(32),
        AndroidEnrollmentProtocolV1.AUDIENCE, (System.currentTimeMillis() + 60_000L).toString(), b64(64)
    )
    @Test fun requestRoundTripsInExactFieldOrder() {
        val encoded = AndroidEnrollmentQrEnvelopeV1.encodeRequest(request())
        assertEquals(request(), AndroidEnrollmentQrEnvelopeV1.decodeRequest(encoded))
    }
    @Test fun approvalRoundTripsInExactFieldOrder() {
        val encoded = AndroidEnrollmentQrEnvelopeV1.encodeApproval(approval())
        assertEquals(approval(), AndroidEnrollmentQrEnvelopeV1.decodeApproval(encoded))
    }
    @Test fun rejectsDuplicateOrReorderedFields() {
        val encoded = AndroidEnrollmentQrEnvelopeV1.encodeRequest(request())
        assertThrows(IllegalArgumentException::class.java) { AndroidEnrollmentQrEnvelopeV1.decodeRequest(encoded.replace("device_fp=", "device_spki=")) }
    }
    @Test fun rejectsApprovalNotBoundToOriginalRequest() {
        assertEquals(false, AndroidEnrollmentQrEnvelopeV1.matchesRequest(request(), approval().copy(challengeId = "Z".repeat(32))))
    }
    @Test fun rejectsWrongAudienceAndExpiredApproval() {
        assertThrows(IllegalArgumentException::class.java) { AndroidEnrollmentQrEnvelopeV1.encodeApproval(approval().copy(audience="https://evil.invalid")) }
        assertThrows(IllegalArgumentException::class.java) { AndroidEnrollmentQrEnvelopeV1.encodeApproval(approval().copy(expiresAt=(System.currentTimeMillis()-1).toString())) }
    }
    @Test fun rejectsOversizedAndCarriageReturnPayloads() {
        assertThrows(IllegalArgumentException::class.java) { AndroidEnrollmentQrEnvelopeV1.decodeRequest("x".repeat(4097)) }
        val encoded=AndroidEnrollmentQrEnvelopeV1.encodeRequest(request())
        assertThrows(IllegalArgumentException::class.java) { AndroidEnrollmentQrEnvelopeV1.decodeRequest(encoded.replace("\n", "\r\n")) }
    }
}