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

class AndroidRootApprovalVerifierV1Test {
    private fun pair(): KeyPair = KeyPairGenerator.getInstance("EC").apply {
        initialize(ECGenParameterSpec("secp256r1"))
    }.generateKeyPair()

    private fun fp(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes)
        .joinToString("") { "%02x".format(it.toInt() and 0xff) }

    private fun b64(bytes: ByteArray) = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    private fun request(device: KeyPair): AndroidEnrollmentQrEnvelopeV1.Request {
        val spki = device.public.encoded
        return AndroidEnrollmentQrEnvelopeV1.Request(
            b64(spki), fp(spki), "C".repeat(32), "N".repeat(32),
            AndroidEnrollmentProtocolV1.AUDIENCE, (System.currentTimeMillis() + 60_000L).toString(),
            b64(ByteArray(64) { 1 })
        )
    }

    private fun signedApproval(root: KeyPair, req: AndroidEnrollmentQrEnvelopeV1.Request): AndroidEnrollmentQrEnvelopeV1.Approval {
        val rootFp = fp(root.public.encoded)
        val unsigned = AndroidEnrollmentQrEnvelopeV1.Approval(
            rootFp, req.deviceFp, req.challengeId, req.nonce, req.audience, req.expiresAt, b64(ByteArray(64) { 1 })
        )
        val canonical = "EZERO_ANDROID_ROOT_APPROVAL_V1\n" +
            "root_fp=${unsigned.rootFp}\n" +
            "device_fp=${unsigned.deviceFp}\n" +
            "challenge_id=${unsigned.challengeId}\n" +
            "nonce=${unsigned.nonce}\n" +
            "audience=${unsigned.audience}\n" +
            "expires_at=${unsigned.expiresAt}\n"
        val der = Signature.getInstance("SHA256withECDSA").run {
            initSign(root.private)
            update(canonical.toByteArray(Charsets.UTF_8))
            sign()
        }
        return unsigned.copy(rootApproval = b64(AndroidSignatureEncoding.derP256ToP1363(der)))
    }

    @Test fun verifiesSignatureUsingSeparatelyTrustedRootKey() {
        val root = pair()
        val req = request(pair())
        val approval = signedApproval(root, req)
        val result = AndroidRootApprovalVerifierV1.verify(req, approval, b64(root.public.encoded), fp(root.public.encoded))
        assertEquals(fp(root.public.encoded), result.rootFingerprint)
        assertEquals(req.deviceFp, result.deviceFingerprint)
    }

    @Test fun rejectsSignatureTampering() {
        val root = pair()
        val req = request(pair())
        val approval = signedApproval(root, req)
        val altered = approval.copy(deviceFp = "f".repeat(64))
        assertThrows(IllegalArgumentException::class.java) {
            AndroidRootApprovalVerifierV1.verify(req, altered, b64(root.public.encoded), fp(root.public.encoded))
        }
    }

    @Test fun rejectsUntrustedRootKeyAndWrongRootFingerprint() {
        val root = pair()
        val req = request(pair())
        val approval = signedApproval(root, req)
        val other = pair()
        assertThrows(IllegalArgumentException::class.java) {
            AndroidRootApprovalVerifierV1.verify(req, approval, b64(other.public.encoded), fp(other.public.encoded))
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidRootApprovalVerifierV1.verify(req, approval, b64(root.public.encoded), "0".repeat(64))
        }
    }

    @Test fun rejectsApprovalBoundToDifferentPendingRequest() {
        val root = pair()
        val req = request(pair())
        val approval = signedApproval(root, req)
        val otherRequest = req.copy(nonce = "X".repeat(32))
        assertThrows(IllegalArgumentException::class.java) {
            AndroidRootApprovalVerifierV1.verify(otherRequest, approval, b64(root.public.encoded), fp(root.public.encoded))
        }
    }
}
