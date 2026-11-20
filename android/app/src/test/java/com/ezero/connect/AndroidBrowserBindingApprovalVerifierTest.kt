package com.ezero.connect

import java.nio.charset.StandardCharsets
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import java.util.Properties
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class AndroidBrowserBindingApprovalVerifierTest {
    private fun keyPair(): KeyPair = KeyPairGenerator.getInstance("EC").apply {
        initialize(ECGenParameterSpec("secp256r1"))
    }.generateKeyPair()

    private fun b64(bytes: ByteArray): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    private fun ownerIdentity(pair: KeyPair): BrowserPermanentIdentityVerifier.VerifiedIdentity {
        val spki = b64(pair.public.encoded)
        val fp = BrowserPermanentIdentityVerifier.sha256Hex(pair.public.encoded)
        val canonical = listOf(
            "EZERO-PERMANENT-IDENTITY-1",
            "https://coma39658-ctrl.github.io",
            spki,
            fp
        ).joinToString("\n").toByteArray(StandardCharsets.UTF_8)
        val der = Signature.getInstance("SHA256withECDSA").run {
            initSign(pair.private)
            update(canonical)
            sign()
        }
        val proof = b64(AndroidBrowserBindingProtocolV1.derToP1363(der))
        return BrowserPermanentIdentityVerifier.verify("EZERO2.$spki.$fp.$proof")
    }

    private fun request(
        ownerFingerprint: String,
        androidPair: KeyPair,
        now: Long,
        origin: String = "https://coma39658-ctrl.github.io"
    ): AndroidBrowserBindingProtocolV1.RequestFields {
        val spki = androidPair.public.encoded
        return AndroidBrowserBindingProtocolV1.RequestFields(
            origin = origin,
            ownerFingerprint = ownerFingerprint,
            androidPublicKeySpkiBase64Url = b64(spki),
            androidFingerprint = BrowserPermanentIdentityVerifier.sha256Hex(spki),
            nonceBase64Url = b64(ByteArray(24) { (it + 1).toByte() }),
            issuedAtEpochSeconds = now,
            expiresAtEpochSeconds = now + 60L
        )
    }

    private fun approvalSignature(owner: KeyPair, request: AndroidBrowserBindingProtocolV1.RequestFields): String {
        val canonical = AndroidBrowserBindingProtocolV1.canonicalRequest(request)
        val signed = ("EZERO-ANDROID-BIND-APPROVAL-1\n" +
            String(canonical, StandardCharsets.UTF_8)).toByteArray(StandardCharsets.UTF_8)
        val der = Signature.getInstance("SHA256withECDSA").run {
            initSign(owner.private)
            update(signed)
            sign()
        }
        return b64(AndroidBrowserBindingProtocolV1.derToP1363(der))
    }

    @Test
    fun verifiesApprovalSignedByTheExactScannedEzero2OwnerKey() {
        val owner = keyPair()
        val scanned = ownerIdentity(owner)
        val android = keyPair()
        val now = 1_800_000_000L
        val request = request(scanned.fingerprintSha256, android, now)
        val signature = approvalSignature(owner, request)

        val verified = AndroidBrowserBindingApprovalVerifier.verify(
            request, signature, scanned, now + 1L
        )

        assertEquals(scanned.fingerprintSha256, verified.ownerFingerprint)
        assertEquals(request.androidFingerprint, verified.androidFingerprint)
        assertEquals(request.nonceBase64Url, verified.nonceBase64Url)
        assertEquals(now + 60L, verified.expiresAtEpochSeconds)
        assertEquals("call-invite-only", verified.capability)
    }

    @Test
    fun rejectsWrongOriginOwnerKeyTamperingAndExpiredChallenge() {
        val owner = keyPair()
        val scanned = ownerIdentity(owner)
        val android = keyPair()
        val now = 1_800_000_000L
        val valid = request(scanned.fingerprintSha256, android, now)
        val signature = approvalSignature(owner, valid)

        assertThrows(IllegalArgumentException::class.java) {
            AndroidBrowserBindingApprovalVerifier.verify(
                valid.copy(origin = "https://attacker.example"), signature, scanned, now
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidBrowserBindingApprovalVerifier.verify(
                valid, signature, ownerIdentity(keyPair()), now
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidBrowserBindingApprovalVerifier.verify(
                valid.copy(androidFingerprint = "0".repeat(64)), signature, scanned, now
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidBrowserBindingApprovalVerifier.verify(
                valid, signature, scanned, now + 60L
            )
        }
    }

    @Test
    fun verifiesSharedGoldenVectorAlsoConsumedByBrowserTests() {
        val props = Properties().apply {
            val stream = javaClass.getResourceAsStream("/ezero_android_browser_binding_golden_v1.properties")
                ?: error("Missing shared golden vector")
            stream.use { load(it) }
        }
        assertEquals("EZERO_ANDROID_BROWSER_BINDING_GOLDEN_V1", props.getProperty("fixture"))
        val ownerSpki = props.getProperty("owner.spki")
        val ownerFingerprint = props.getProperty("owner.fingerprint")
        val ownerCanonical = props.getProperty("owner.canonical")
        val ownerProof = props.getProperty("owner.proof.p1363")
        assertEquals(
            ownerCanonical,
            listOf("EZERO-PERMANENT-IDENTITY-1", props.getProperty("origin"), ownerSpki, ownerFingerprint)
                .joinToString("\\n")
        )
        val token = "EZERO2.$ownerSpki.$ownerFingerprint.$ownerProof"
        val scanned = BrowserPermanentIdentityVerifier.verify(token)
        val androidSpki = props.getProperty("android.spki")
        val request = AndroidBrowserBindingProtocolV1.RequestFields(
            origin = props.getProperty("origin"),
            ownerFingerprint = ownerFingerprint,
            androidPublicKeySpkiBase64Url = androidSpki,
            androidFingerprint = props.getProperty("android.fingerprint"),
            nonceBase64Url = props.getProperty("request.nonce"),
            issuedAtEpochSeconds = props.getProperty("request.issued").toLong(),
            expiresAtEpochSeconds = props.getProperty("request.expires").toLong()
        )
        val canonical = String(
            AndroidBrowserBindingProtocolV1.canonicalRequest(request),
            StandardCharsets.UTF_8
        )
        assertEquals(props.getProperty("request.canonical"), canonical)
        assertEquals(
            "EZERO-ANDROID-BIND-APPROVAL-1",
            props.getProperty("approval.domain")
        )
        val verified = AndroidBrowserBindingApprovalVerifier.verify(
            request,
            props.getProperty("approval.signature.p1363"),
            scanned,
            request.issuedAtEpochSeconds + 1L
        )
        assertEquals(ownerFingerprint, verified.ownerFingerprint)
        assertEquals(props.getProperty("android.fingerprint"), verified.androidFingerprint)
        assertEquals(props.getProperty("request.nonce"), verified.nonceBase64Url)
        assertEquals("call-invite-only", verified.capability)
    }

    @Test
    fun rejectsModifiedApprovalSignature() {
        val owner = keyPair()
        val scanned = ownerIdentity(owner)
        val android = keyPair()
        val now = 1_800_000_000L
        val request = request(scanned.fingerprintSha256, android, now)
        val signature = approvalSignature(owner, request)
        val changed = if (signature[0] == 'A') "B" else "A"

        assertThrows(IllegalArgumentException::class.java) {
            AndroidBrowserBindingApprovalVerifier.verify(
                request, changed + signature.drop(1), scanned, now
            )
        }
    }
}
