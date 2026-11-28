package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64

class AndroidEnrollmentApprovalGateV1Test {
    private fun pair(): KeyPair = KeyPairGenerator.getInstance("EC").apply {
        initialize(ECGenParameterSpec("secp256r1"))
    }.generateKeyPair()
    private fun fp(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes)
        .joinToString("") { "%02x".format(it.toInt() and 0xff) }
    private fun b64(bytes: ByteArray) = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    private data class Fixture(
        val request: String,
        val approval: String,
        val pin: AndroidRootTrustPinV1.Pin
    )

    private fun fixture(): Fixture {
        val device = pair()
        val root = pair()
        val spki = device.public.encoded
        val deviceFp = fp(spki)
        val expires = (System.currentTimeMillis() + 60_000L).toString()
        val challenge = AndroidEnrollmentProtocolV1.Challenge(
            "C".repeat(32), deviceFp, "N".repeat(32), AndroidEnrollmentProtocolV1.AUDIENCE, expires
        )
        val deviceDer = Signature.getInstance("SHA256withECDSA").run {
            initSign(device.private)
            update(AndroidEnrollmentProtocolV1.canonicalChallenge(challenge))
            sign()
        }
        val request = AndroidEnrollmentQrEnvelopeV1.Request(
            b64(spki), deviceFp, challenge.challengeId, challenge.nonce, challenge.audience,
            challenge.expiresAt, b64(AndroidSignatureEncoding.derP256ToP1363(deviceDer))
        )
        val rootFp = fp(root.public.encoded)
        val unsigned = AndroidEnrollmentQrEnvelopeV1.Approval(
            rootFp, deviceFp, challenge.challengeId, challenge.nonce, challenge.audience,
            challenge.expiresAt, b64(ByteArray(64) { 1 })
        )
        val canonical = "EZERO_ANDROID_ROOT_APPROVAL_V1\n" +
            "root_fp=${unsigned.rootFp}\n" +
            "device_fp=${unsigned.deviceFp}\n" +
            "challenge_id=${unsigned.challengeId}\n" +
            "nonce=${unsigned.nonce}\n" +
            "audience=${unsigned.audience}\n" +
            "expires_at=${unsigned.expiresAt}\n"
        val rootDer = Signature.getInstance("SHA256withECDSA").run {
            initSign(root.private)
            update(canonical.toByteArray(Charsets.UTF_8))
            sign()
        }
        val approval = unsigned.copy(rootApproval = b64(AndroidSignatureEncoding.derP256ToP1363(rootDer)))
        return Fixture(
            AndroidEnrollmentQrEnvelopeV1.encodeRequest(request),
            AndroidEnrollmentQrEnvelopeV1.encodeApproval(approval),
            AndroidRootTrustPinV1.Pin(b64(root.public.encoded), rootFp)
        )
    }

    @Test fun joinsDeviceProofAndIndependentlyPinnedRootApproval() {
        val f = fixture()
        val result = AndroidEnrollmentApprovalGateV1.verify(f.request, f.approval, f.pin)
        assertEquals(f.pin.fingerprint, result.rootFingerprint)
        assertEquals(AndroidEnrollmentQrEnvelopeV1.decodeRequest(f.request).deviceFp, result.deviceFingerprint)
    }

    @Test fun rejectsApprovalWhenRootPinDoesNotMatch() {
        val f = fixture()
        val other = pair()
        val wrongPin = AndroidRootTrustPinV1.Pin(b64(other.public.encoded), fp(other.public.encoded))
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentApprovalGateV1.verify(f.request, f.approval, wrongPin)
        }
    }

    @Test fun rejectsTamperedDeviceProof() {
        val f = fixture()
        val request = AndroidEnrollmentQrEnvelopeV1.decodeRequest(f.request)
        val changed = request.copy(deviceProof = b64(ByteArray(64) { 9 }))
        val tampered = AndroidEnrollmentQrEnvelopeV1.encodeRequest(changed)
        assertThrows(IllegalArgumentException::class.java) {
            AndroidEnrollmentApprovalGateV1.verify(tampered, f.approval, f.pin)
        }
    }
}
