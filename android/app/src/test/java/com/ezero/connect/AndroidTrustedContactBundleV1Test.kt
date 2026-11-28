package com.ezero.connect

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64

class AndroidTrustedContactBundleV1Test {
    private val origin = "https://coma39658-ctrl.github.io"
    private fun keyPair(): KeyPair = KeyPairGenerator.getInstance("EC").apply {
        initialize(ECGenParameterSpec("secp256r1"))
    }.generateKeyPair()
    private fun b64(bytes: ByteArray) = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    private fun fp(spki: ByteArray) = MessageDigest.getInstance("SHA-256").digest(spki)
        .joinToString("") { "%02X".format(it.toInt() and 0xff) }.chunked(2).joinToString(":")
    private fun canonical(value: Any?): String = when (value) {
        null, JSONObject.NULL -> "null"
        is String -> JSONObject.quote(value)
        is Boolean -> value.toString()
        is Number -> value.toString()
        is JSONObject -> value.keys().asSequence().toList().sorted().joinToString(",", "{", "}") {
            JSONObject.quote(it) + ":" + canonical(value.get(it))
        }
        is JSONArray -> (0 until value.length()).joinToString(",", "[", "]") { canonical(value.get(it)) }
        else -> error("bad canonical value")
    }
    private fun sign(pair: KeyPair, value: Any): String {
        val signer = Signature.getInstance("SHA256withECDSAinP1363Format")
        signer.initSign(pair.private)
        signer.update(canonical(value).toByteArray(Charsets.UTF_8))
        return b64(signer.sign())
    }
    private data class Fixture(val raw: String, val pin: AndroidRootTrustPinV1.Pin, val now: Long)
    private fun fixture(): Fixture {
        val now = System.currentTimeMillis()
        val root = keyPair()
        val remote = keyPair()
        val rootSpki = b64(root.public.encoded)
        val remoteSpki = b64(remote.public.encoded)
        val rootFp = fp(root.public.encoded)
        val remoteFp = fp(remote.public.encoded)
        val participants = listOf(
            JSONObject().put("fingerprint", rootFp).put("publicKeySpki", rootSpki),
            JSONObject().put("fingerprint", remoteFp).put("publicKeySpki", remoteSpki)
        ).sortedBy { it.getString("fingerprint") }
        val room = "R".repeat(32)
        val nonce = "N".repeat(32)
        val transcript = JSONObject()
            .put("v", 2)
            .put("protocol", "E-ZERO-TRUST-2")
            .put("purpose", "consented-invite-auto-save")
            .put("origin", origin)
            .put("roomId", room)
            .put("inviteNonce", nonce)
            .put("inviteIssuedAt", now - 1000L)
            .put("inviteExpiresAt", now - 500L)
            .put("inviterFingerprint", rootFp)
            .put("participants", JSONArray(participants))
        val relationshipId = MessageDigest.getInstance("SHA-256")
            .digest(canonical(transcript).toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }
        val proof = JSONObject()
            .put("v", 1)
            .put("protocol", "E-ZERO-SIGNAL-HELLO-1")
            .put("origin", origin)
            .put("roomId", room)
            .put("inviteNonce", nonce)
            .put("role", "guest")
            .put("fingerprint", remoteFp)
            .put("publicKeySpki", remoteSpki)
            .put("challenge", b64(ByteArray(32) { (it + 1).toByte() }))
            .put("challengeExpiresAt", now + 20_000L)
        val peerHandshake = JSONObject()
            .put("payload", proof)
            .put("signature", sign(remote, proof))
        val payload = JSONObject()
            .put("v", 1)
            .put("protocol", "E-ZERO-ANDROID-TRUST-BUNDLE-1")
            .put("origin", origin)
            .put("rootFingerprint", rootFp)
            .put("rootSpki", rootSpki)
            .put("localFingerprint", rootFp)
            .put("remoteFingerprint", remoteFp)
            .put("remotePublicKeySpki", remoteSpki)
            .put("relationshipId", relationshipId)
            .put("displayName", "Test Friend")
            .put("trustVersion", 2)
            .put("transcript", transcript)
            .put("localApproval", JSONObject.NULL)
            .put("remoteApproval", JSONObject.NULL)
            .put("peerHandshake", peerHandshake)
            .put("issuedAt", now)
            .put("expiresAt", now + 60_000L)
            .put("nonce", b64(ByteArray(24) { (it + 2).toByte() }))
        val envelope = JSONObject().put("payload", payload).put("signature", sign(root, payload))
        val raw = "EZERO-ANDROID-TRUST1." + b64(envelope.toString().toByteArray(Charsets.UTF_8))
        val pin = AndroidRootTrustPinV1.Pin(rootSpki, rootFp.replace(":", "").lowercase())
        return Fixture(raw, pin, now)
    }

    private fun legacyFixture(): Fixture {
        val now = System.currentTimeMillis()
        val root = keyPair()
        val remote = keyPair()
        val rootSpki = b64(root.public.encoded)
        val remoteSpki = b64(remote.public.encoded)
        val rootFp = fp(root.public.encoded)
        val remoteFp = fp(remote.public.encoded)
        val participants = listOf(
            JSONObject().put("fingerprint", rootFp).put("publicKeySpki", rootSpki),
            JSONObject().put("fingerprint", remoteFp).put("publicKeySpki", remoteSpki)
        ).sortedBy { it.getString("fingerprint") }
        val transcript = JSONObject()
            .put("v", 1)
            .put("protocol", "E-ZERO-TRUST-1")
            .put("purpose", "mutual-contact-save")
            .put("participants", JSONArray(participants))
            .put("roomId", "R".repeat(32))
            .put("inviteNonce", "N".repeat(32))
            .put("inviteIssuedAt", now - 10_000L)
            .put("inviteExpiresAt", now - 9_000L)
            .put("createdAt", now - 9_500L)
        val transcriptHash = MessageDigest.getInstance("SHA-256")
            .digest(canonical(transcript).toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }
        val localApproval = JSONObject()
            .put("signerFingerprint", rootFp)
            .put("transcriptHash", transcriptHash)
            .put("signature", sign(root, transcript))
        val remoteApproval = JSONObject()
            .put("signerFingerprint", remoteFp)
            .put("transcriptHash", transcriptHash)
            .put("signature", sign(remote, transcript))
        val payload = JSONObject()
            .put("v", 1)
            .put("protocol", "E-ZERO-ANDROID-TRUST-BUNDLE-1")
            .put("origin", origin)
            .put("rootFingerprint", rootFp)
            .put("rootSpki", rootSpki)
            .put("localFingerprint", rootFp)
            .put("remoteFingerprint", remoteFp)
            .put("remotePublicKeySpki", remoteSpki)
            .put("relationshipId", transcriptHash)
            .put("displayName", "Legacy Friend")
            .put("trustVersion", 1)
            .put("transcript", transcript)
            .put("localApproval", localApproval)
            .put("remoteApproval", remoteApproval)
            .put("peerHandshake", JSONObject.NULL)
            .put("issuedAt", now)
            .put("expiresAt", now + 60_000L)
            .put("nonce", b64(ByteArray(24) { (it + 3).toByte() }))
        val envelope = JSONObject().put("payload", payload).put("signature", sign(root, payload))
        val raw = "EZERO-ANDROID-TRUST1." + b64(envelope.toString().toByteArray(Charsets.UTF_8))
        val pin = AndroidRootTrustPinV1.Pin(rootSpki, rootFp.replace(":", "").lowercase())
        return Fixture(raw, pin, now)
    }

    private fun mutatePayload(raw: String, change: (JSONObject) -> Unit): String {
        val prefix = "EZERO-ANDROID-TRUST1."
        val envelope = JSONObject(Base64.getUrlDecoder().decode(raw.removePrefix(prefix)).toString(Charsets.UTF_8))
        change(envelope.getJSONObject("payload"))
        return prefix + b64(envelope.toString().toByteArray(Charsets.UTF_8))
    }

    @Test fun verifiesRootSignedTrustedFriendBundleAndRelationship() {
        val f = fixture()
        val contact = AndroidTrustedContactBundleV1.verifyBundle(f.raw, f.pin, f.now)
        assertEquals("Test Friend", contact.displayName)
        assertEquals("TRUSTED", contact.status)
        assertEquals(2, contact.trustVersion)
    }

    @Test fun verifiesLegacyDualApprovedTrustedFriendBundle() {
        val f = legacyFixture()
        val contact = AndroidTrustedContactBundleV1.verifyBundle(f.raw, f.pin, f.now)
        assertEquals("Legacy Friend", contact.displayName)
        assertEquals(1, contact.trustVersion)
        assertEquals("TRUSTED", contact.status)
    }

    @Test fun rejectsModifiedPayloadAndWrongRootPin() {
        val f = fixture()
        val changed = mutatePayload(f.raw) { it.put("displayName", "Attacker") }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidTrustedContactBundleV1.verifyBundle(changed, f.pin, f.now)
        }
        val other = keyPair()
        val otherPin = AndroidRootTrustPinV1.Pin(
            b64(other.public.encoded), fp(other.public.encoded).replace(":", "").lowercase()
        )
        assertThrows(IllegalArgumentException::class.java) {
            AndroidTrustedContactBundleV1.verifyBundle(f.raw, otherPin, f.now)
        }
    }

    @Test fun rejectsExpiredOrWrongOriginBundles() {
        val f = fixture()
        assertThrows(IllegalArgumentException::class.java) {
            AndroidTrustedContactBundleV1.verifyBundle(f.raw, f.pin, f.now + 90_001L)
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidTrustedContactBundleV1.verifyBundle(mutatePayload(f.raw) { it.put("origin", "https://evil.invalid") }, f.pin, f.now)
        }
    }

    @Test fun rejectsRelationshipIdMismatchAndMalformedPrefix() {
        val f = fixture()
        val changed = mutatePayload(f.raw) { it.put("relationshipId", "0".repeat(64)) }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidTrustedContactBundleV1.verifyBundle(changed, f.pin, f.now)
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidTrustedContactBundleV1.verifyBundle("not-a-trust-bundle", f.pin, f.now)
        }
    }

    @Test fun qrRouterRecognizesTrustBundleWithoutGrantingTrust() {
        assertEquals(
            AndroidQrPayloadRouter.Kind.TRUSTED_CONTACT_BUNDLE,
            AndroidQrPayloadRouter.classify("EZERO-ANDROID-TRUST1.payload")
        )
    }
}
