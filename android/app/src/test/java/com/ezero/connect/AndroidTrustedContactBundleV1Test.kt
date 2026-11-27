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
    private fun p1363(der: ByteArray): ByteArray {
        var i = 3
        fun readInteger(): ByteArray {
            require(der[i++].toInt() == 0x02)
            val length = der[i++].toInt() and 0xff
            var v = der.copyOfRange(i, i + length); i += length
            while (v.size > 32 && v[0] == 0.toByte()) v = v.copyOfRange(1, v.size)
            if (v.size == 33 && v[0] == 0.toByte()) v = v.copyOfRange(1, v.size)
            return ByteArray(32 - v.size) + v
        }
        return readInteger() + readInteger()
    }
    private fun sign(pair: KeyPair, value: Any): String {
        val signer = Signature.getInstance("SHA256withECDSA")
        signer.initSign(pair.private)
        signer.update(canonical(value).toByteArray(Charsets.UTF_8))
        return b64(p1363(signer.sign()))
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

    @Test fun verifiesRootSignedTrustedFriendBundleAndRelationship() {
        val f = fixture()
        val contact = AndroidTrustedContactBundleV1.verifyBundle(f.raw, f.pin, f.now)
        assertEquals("Test Friend", contact.displayName)
        assertEquals("TRUSTED", contact.status)
        assertEquals(2, contact.trustVersion)
    }

    @Test fun rejectsModifiedPayloadAndWrongRootPin() {
        val f = fixture()
        val changed = f.raw.replace("Test Friend", "Attacker")
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
            AndroidTrustedContactBundleV1.verifyBundle(f.raw.replace(origin, "https://evil.invalid"), f.pin, f.now)
        }
    }

    @Test fun rejectsRelationshipIdMismatchAndMalformedPrefix() {
        val f = fixture()
        val changed = f.raw.replace("relationshipId", "relationshipX")
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
