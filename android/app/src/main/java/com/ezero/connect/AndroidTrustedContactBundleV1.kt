package com.ezero.connect

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyFactory
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Signature
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.X509EncodedKeySpec
import android.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Imports a short-lived Root-signed copy of an already trusted browser contact.
 * Importing a QR never creates a new friendship: the existing Root signature,
 * relationship transcript, remote key and original peer proof are all checked.
 */
internal object AndroidTrustedContactBundleV1 {
    private const val PREFIX = "EZERO-ANDROID-TRUST1."
    private const val ORIGIN = "https://coma39658-ctrl.github.io"
    private const val MAX_BUNDLE_BYTES = 12_000
    private const val MAX_BUNDLE_JSON_BYTES = 9_000
    private const val KEY_ALIAS = "ezero.trusted.contacts.aesgcm.v1"
    private const val PREFS = "ezero_trusted_contacts_v1"
    private const val KEY_CIPHERTEXT = "encrypted_records"

    data class TrustedContact(
        val relationshipId: String,
        val remoteFingerprint: String,
        val remotePublicKeySpki: String,
        val displayName: String,
        val trustVersion: Int,
        val importedAt: Long,
        val status: String = "TRUSTED"
    )

    private fun decode64(value: String, max: Int = 4096): ByteArray {
        require(value.isNotEmpty() && value.length <= max &&
            value.matches(Regex("^[A-Za-z0-9_-]+$")) && value.length % 4 != 1) {
            "TRUST_BUNDLE_BASE64_INVALID"
        }
        val bytes = Base64.decode(value, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        require(Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING) == value) {
            "TRUST_BUNDLE_BASE64_NON_CANONICAL"
        }
        return bytes
    }

    private fun encode64(bytes: ByteArray): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    private fun canonical(value: Any?): String = when (value) {
        null, JSONObject.NULL -> "null"
        is String -> JSONObject.quote(value)
        is Boolean -> value.toString()
        is Number -> {
            require(value.toDouble().isFinite()) { "TRUST_CANONICAL_NUMBER_INVALID" }
            value.toString()
        }
        is JSONObject -> {
            val keys = value.keys().asSequence().toList().sorted()
            "{" + keys.joinToString(",") { key ->
                JSONObject.quote(key) + ":" + canonical(value.get(key))
            } + "}"
        }
        is JSONArray -> "[" + (0 until value.length()).joinToString(",") { canonical(value.get(it)) } + "]"
        else -> throw IllegalArgumentException("TRUST_CANONICAL_TYPE_INVALID")
    }

    private fun fingerprint(spki: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(spki)
            .joinToString("") { "%02X".format(it.toInt() and 0xff) }
            .chunked(2).joinToString(":")

    private fun publicKey(spkiText: String): ECPublicKey {
        val spki = decode64(spkiText, 512)
        require(spki.size in 80..160) { "TRUST_PUBLIC_KEY_SIZE_INVALID" }
        val key = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(spki)) as? ECPublicKey
            ?: throw IllegalArgumentException("TRUST_PUBLIC_KEY_INVALID")
        val p256 = java.security.AlgorithmParameters.getInstance("EC").apply {
            init(ECGenParameterSpec("secp256r1"))
        }.getParameterSpec(ECParameterSpec::class.java)
        require(key.params.curve == p256.curve && key.params.generator == p256.generator &&
            key.params.order == p256.order && key.params.cofactor == p256.cofactor) {
            "TRUST_PUBLIC_KEY_NOT_P256"
        }
        return key
    }

    private fun p1363ToDer(raw: ByteArray): ByteArray {
        require(raw.size == 64) { "TRUST_SIGNATURE_SIZE_INVALID" }
        fun integer(part: ByteArray): ByteArray {
            var start = 0
            while (start < part.size - 1 && part[start] == 0.toByte()) start++
            var v = part.copyOfRange(start, part.size)
            if ((v[0].toInt() and 0x80) != 0) v = byteArrayOf(0) + v
            return byteArrayOf(0x02, v.size.toByte()) + v
        }
        val body = integer(raw.copyOfRange(0, 32)) + integer(raw.copyOfRange(32, 64))
        return byteArrayOf(0x30, body.size.toByte()) + body
    }

    private fun verify(publicKey: ECPublicKey, signatureText: String, value: Any): Boolean {
        val signature = p1363ToDer(decode64(signatureText, 128))
        return Signature.getInstance("SHA256withECDSA").run {
            initVerify(publicKey)
            update(canonical(value).toByteArray(Charsets.UTF_8))
            verify(signature)
        }
    }

    private fun sha256Hex(value: Any): String =
        MessageDigest.getInstance("SHA-256")
            .digest(canonical(value).toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }

    private fun verifyTranscript(payload: JSONObject, trustVersion: Int, rootFingerprint: String): Pair<String, String> {
        val transcript = payload.getJSONObject("transcript")
        val expectedProtocol = if (trustVersion == 1) "E-ZERO-TRUST-1" else "E-ZERO-TRUST-2"
        val expectedPurpose = if (trustVersion == 1) "mutual-contact-save" else "consented-invite-auto-save"
        require(transcript.optInt("v") == trustVersion &&
            transcript.optString("protocol") == expectedProtocol &&
            transcript.optString("purpose") == expectedPurpose) { "TRUST_TRANSCRIPT_VERSION_INVALID" }
        val participants = transcript.getJSONArray("participants")
        require(participants.length() == 2) { "TRUST_PARTICIPANTS_INVALID" }
        val first = participants.getJSONObject(0)
        val second = participants.getJSONObject(1)
        val firstFp = first.getString("fingerprint")
        val secondFp = second.getString("fingerprint")
        require(firstFp < secondFp) { "TRUST_PARTICIPANT_ORDER_INVALID" }
        val roomId = transcript.optString("roomId")
        val inviteNonce = transcript.optString("inviteNonce")
        require(roomId.matches(Regex("^[A-Za-z0-9_-]{32}$")) &&
            inviteNonce.matches(Regex("^[A-Za-z0-9_-]{32}$"))) { "TRUST_TRANSCRIPT_NONCE_INVALID" }
        val inviteIssuedAt = transcript.optLong("inviteIssuedAt", -1L)
        val inviteExpiresAt = transcript.optLong("inviteExpiresAt", -1L)
        require(inviteIssuedAt > 0L && inviteExpiresAt > inviteIssuedAt &&
            inviteExpiresAt - inviteIssuedAt <= 90_000L) { "TRUST_TRANSCRIPT_TIME_INVALID" }
        if (trustVersion == 1) {
            val createdAt = transcript.optLong("createdAt", -1L)
            require(createdAt in inviteIssuedAt..inviteExpiresAt) { "TRUST_TRANSCRIPT_CREATED_AT_INVALID" }
        }
        val rootSpki = payload.getString("rootSpki")
        val remoteSpki = payload.getString("remotePublicKeySpki")
        val local = (0 until 2).map { participants.getJSONObject(it) }
            .singleOrNull { it.optString("fingerprint") == rootFingerprint }
            ?: throw IllegalArgumentException("TRUST_ROOT_NOT_IN_TRANSCRIPT")
        val remoteFp = payload.getString("remoteFingerprint")
        val remote = (0 until 2).map { participants.getJSONObject(it) }
            .singleOrNull { it.optString("fingerprint") == remoteFp }
            ?: throw IllegalArgumentException("TRUST_REMOTE_NOT_IN_TRANSCRIPT")
        require(local.getString("publicKeySpki") == rootSpki) { "TRUST_ROOT_KEY_MISMATCH" }
        require(remote.getString("publicKeySpki") == remoteSpki) { "TRUST_REMOTE_KEY_MISMATCH" }
        require(fingerprint(publicKey(rootSpki).encoded) == rootFingerprint) { "TRUST_ROOT_FINGERPRINT_MISMATCH" }
        require(fingerprint(publicKey(remoteSpki).encoded) == remoteFp) { "TRUST_REMOTE_FINGERPRINT_MISMATCH" }

        if (trustVersion == 1) {
            val hash = sha256Hex(transcript)
            val localApproval = payload.optJSONObject("localApproval")
                ?: throw IllegalArgumentException("TRUST_LOCAL_APPROVAL_MISSING")
            val remoteApproval = payload.optJSONObject("remoteApproval")
                ?: throw IllegalArgumentException("TRUST_REMOTE_APPROVAL_MISSING")
            val approvals = listOf(localApproval, remoteApproval)
            val signers = approvals.map { it.optString("signerFingerprint") }.toSet()
            require(signers == setOf(rootFingerprint, remoteFp)) { "TRUST_APPROVAL_SIGNERS_INVALID" }
            for (approval in approvals) {
                require(approval.optString("transcriptHash") == hash) { "TRUST_APPROVAL_HASH_MISMATCH" }
                val signerFp = approval.getString("signerFingerprint")
                val signer = if (signerFp == rootFingerprint) publicKey(rootSpki) else publicKey(remoteSpki)
                require(verify(signer, approval.getString("signature"), transcript)) { "TRUST_APPROVAL_SIGNATURE_INVALID" }
            }
        } else {
            require(transcript.optString("origin") == ORIGIN &&
                transcript.optString("inviterFingerprint") in setOf(rootFingerprint, remoteFp)) {
                "TRUST_V2_TRANSCRIPT_BINDING_INVALID"
            }
            val peer = payload.optJSONObject("peerHandshake")
                ?: throw IllegalArgumentException("TRUST_PEER_PROOF_MISSING")
            val proof = peer.getJSONObject("payload")
            require(proof.optString("protocol") == "E-ZERO-SIGNAL-HELLO-1" &&
                proof.optString("origin") == ORIGIN &&
                proof.optString("roomId") == transcript.optString("roomId") &&
                proof.optString("inviteNonce") == transcript.optString("inviteNonce") &&
                proof.optString("fingerprint") == remoteFp &&
                proof.optString("publicKeySpki") == remoteSpki &&
                proof.optString("role") == (if (transcript.optString("inviterFingerprint") == rootFingerprint) "guest" else "host") &&
                proof.optString("challenge").matches(Regex("^[A-Za-z0-9_-]{43}$")) &&
                proof.optLong("challengeExpiresAt", -1L) > 0L) {
                "TRUST_PEER_PROOF_BINDING_INVALID"
            }
            require(verify(publicKey(remoteSpki), peer.getString("signature"), proof)) {
                "TRUST_PEER_PROOF_SIGNATURE_INVALID"
            }
        }
        return transcript.optString("protocol") to remoteFp
    }

    fun verifyBundle(raw: String, trustedRoot: AndroidRootTrustPinV1.Pin, nowMillis: Long = System.currentTimeMillis()): TrustedContact {
        require(raw.toByteArray(Charsets.UTF_8).size <= MAX_BUNDLE_BYTES && raw.startsWith(PREFIX)) {
            "TRUST_BUNDLE_SIZE_OR_PREFIX_INVALID"
        }
        val encoded = raw.removePrefix(PREFIX)
        val decoded = decode64(encoded, MAX_BUNDLE_JSON_BYTES)
        val envelope = JSONObject(decoded.toString(Charsets.UTF_8))
        require(envelope.keys().asSequence().toSet() == setOf("payload", "signature")) {
            "TRUST_BUNDLE_ENVELOPE_FIELDS_INVALID"
        }
        val payload = envelope.getJSONObject("payload")
        val expectedFields = setOf(
            "v","protocol","origin","rootFingerprint","rootSpki","localFingerprint",
            "remoteFingerprint","remotePublicKeySpki","relationshipId","displayName",
            "trustVersion","transcript","localApproval","remoteApproval","peerHandshake",
            "issuedAt","expiresAt","nonce"
        )
        require(payload.keys().asSequence().toSet() == expectedFields) { "TRUST_BUNDLE_FIELDS_INVALID" }
        require(payload.optInt("v") == 1 &&
            payload.optString("protocol") == "E-ZERO-ANDROID-TRUST-BUNDLE-1" &&
            payload.optString("origin") == ORIGIN) { "TRUST_BUNDLE_PROTOCOL_INVALID" }

        val rootFp = payload.getString("rootFingerprint")
        val pinned = trustedRoot.fingerprint.chunked(2).joinToString(":").uppercase()
        require(rootFp == pinned && payload.optString("localFingerprint") == rootFp) {
            "TRUST_BUNDLE_ROOT_MISMATCH"
        }
        val rootSpki = payload.getString("rootSpki")
        require(encode64(Base64.decode(trustedRoot.spkiBase64Url, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)) == rootSpki) {
            "TRUST_BUNDLE_ROOT_KEY_MISMATCH"
        }
        val issued = payload.getLong("issuedAt")
        val expires = payload.getLong("expiresAt")
        require(issued <= nowMillis + 5000L && expires > nowMillis &&
            expires > issued && expires - issued <= 90_000L) { "TRUST_BUNDLE_EXPIRED_OR_TIME_INVALID" }
        require(decode64(payload.getString("nonce"), 64).size == 24) { "TRUST_BUNDLE_NONCE_INVALID" }
        val displayName = payload.optString("displayName", "")
        require(displayName.length <= 64 && displayName.none { it.code < 0x20 || it.code == 0x7f }) {
            "TRUST_BUNDLE_DISPLAY_NAME_INVALID"
        }
        val trustVersion = payload.getInt("trustVersion")
        require(trustVersion == 1 || trustVersion == 2) { "TRUST_BUNDLE_TRUST_VERSION_INVALID" }
        val relationshipId = payload.getString("relationshipId")
        require(relationshipId.matches(Regex("^[a-f0-9]{64}$")) &&
            sha256Hex(payload.getJSONObject("transcript")) == relationshipId) {
            "TRUST_BUNDLE_RELATIONSHIP_MISMATCH"
        }
        val (protocol, remoteFp) = verifyTranscript(payload, trustVersion, rootFp)
        require(remoteFp == payload.getString("remoteFingerprint")) { "TRUST_BUNDLE_REMOTE_MISMATCH" }
        val rootKey = publicKey(rootSpki)
        require(verify(rootKey, envelope.getString("signature"), payload)) { "TRUST_BUNDLE_ROOT_SIGNATURE_INVALID" }
        return TrustedContact(
            relationshipId = relationshipId,
            remoteFingerprint = remoteFp,
            remotePublicKeySpki = payload.getString("remotePublicKeySpki"),
            displayName = displayName,
            trustVersion = trustVersion,
            importedAt = nowMillis
        )
    }

    private fun storageKey(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val existing = store.getKey(KEY_ALIAS, null) as? SecretKey
        if (existing != null) return existing
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(KeyGenParameterSpec.Builder(
            KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .setKeySize(256)
            .build())
        return generator.generateKey()
    }

    private fun readStored(context: Context): MutableList<TrustedContact> {
        val blob = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_CIPHERTEXT, null)
            ?: return mutableListOf()
        val parts = blob.split(".")
        require(parts.size == 2) { "TRUST_STORE_FORMAT_INVALID" }
        val iv = Base64.decode(parts[0], Base64.NO_WRAP)
        val ciphertext = Base64.decode(parts[1], Base64.NO_WRAP)
        require(iv.size == 12 && ciphertext.size <= 64_000) { "TRUST_STORE_SIZE_INVALID" }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, storageKey(), GCMParameterSpec(128, iv))
        val json = JSONArray(cipher.doFinal(ciphertext).toString(Charsets.UTF_8))
        return (0 until json.length()).map { i ->
            val item = json.getJSONObject(i)
            TrustedContact(
                item.getString("relationshipId"), item.getString("remoteFingerprint"),
                item.getString("remotePublicKeySpki"), item.optString("displayName", ""),
                item.getInt("trustVersion"), item.getLong("importedAt"), item.optString("status", "TRUSTED")
            )
        }.toMutableList()
    }

    private fun writeStored(context: Context, records: List<TrustedContact>) {
        val json = JSONArray()
        records.forEach { record ->
            json.put(JSONObject()
                .put("relationshipId", record.relationshipId)
                .put("remoteFingerprint", record.remoteFingerprint)
                .put("remotePublicKeySpki", record.remotePublicKeySpki)
                .put("displayName", record.displayName)
                .put("trustVersion", record.trustVersion)
                .put("importedAt", record.importedAt)
                .put("status", record.status))
        }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, storageKey())
        val encrypted = cipher.doFinal(json.toString().toByteArray(Charsets.UTF_8))
        val blob = Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + "." +
            Base64.encodeToString(encrypted, Base64.NO_WRAP)
        require(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_CIPHERTEXT, blob).commit()) { "TRUST_STORE_WRITE_FAILED" }
    }

    fun importAndSave(context: Context, raw: String, trustedRoot: AndroidRootTrustPinV1.Pin): TrustedContact {
        val verified = verifyBundle(raw, trustedRoot)
        val records = readStored(context)
        val existing = records.firstOrNull { it.remoteFingerprint == verified.remoteFingerprint }
        require(existing?.status != "BLOCKED") { "TRUST_CONTACT_BLOCKED" }
        if (existing != null && existing.relationshipId == verified.relationshipId) return existing
        records.removeAll { it.remoteFingerprint == verified.remoteFingerprint && it.status != "BLOCKED" }
        records.add(verified)
        require(records.size <= 200) { "TRUST_CONTACT_LIMIT_REACHED" }
        writeStored(context, records)
        return verified
    }

    fun listTrusted(context: Context): List<TrustedContact> =
        readStored(context).filter { it.status == "TRUSTED" }

    fun getTrustedPeerForCall(context: Context, remoteFingerprint: String): TrustedContact? {
        if (!remoteFingerprint.matches(Regex("^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$"))) return null
        val records = readStored(context).filter { it.remoteFingerprint == remoteFingerprint }
        if (records.size != 1 || records.single().status != "TRUSTED") return null
        return records.single()
    }

    fun setStatus(context: Context, remoteFingerprint: String, status: String): Boolean {
        require(status == "BLOCKED" || status == "REVOKED") { "TRUST_STATUS_INVALID" }
        val records = readStored(context)
        val changed = records.map { record ->
            if (record.remoteFingerprint == remoteFingerprint) record.copy(status = status) else record
        }
        if (changed == records) return false
        writeStored(context, changed)
        return true
    }
}
