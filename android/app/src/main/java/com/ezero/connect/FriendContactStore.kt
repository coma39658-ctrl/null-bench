package com.ezero.connect

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.nio.ByteBuffer
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Local-only contact vault. Stores verified public identity material, never call/session secrets. */
internal class FriendContactStore(context: Context) {
    data class Contact(
        val name: String,
        val fingerprintSha256: String,
        val publicKeySpkiBase64Url: String
    )

    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    @Synchronized
    fun all(): List<Contact> = decode(decrypt(prefs.getString(DATA, null)))

    @Synchronized
    fun save(name: String, fingerprint: String, publicKey: String) {
        val cleanName = name.trim()
        require(cleanName.isNotEmpty() && cleanName.length <= 40) { "INVALID_FRIEND_NAME" }
        require(fingerprint.matches(Regex("^[a-f0-9]{64}$"))) { "INVALID_FINGERPRINT" }
        require(publicKey.matches(Regex("^[A-Za-z0-9_-]{50,240}$"))) { "INVALID_PUBLIC_KEY" }
        val contacts = all().toMutableList()
        val existing = contacts.indexOfFirst { it.fingerprintSha256 == fingerprint }
        val contact = Contact(cleanName, fingerprint, publicKey)
        if (existing >= 0) contacts[existing] = contact else contacts.add(contact)
        persist(contacts)
    }

    @Synchronized
    fun delete(fingerprint: String) {
        persist(all().filterNot { it.fingerprintSha256 == fingerprint })
    }

    private fun persist(contacts: List<Contact>) {
        val array = JSONArray()
        contacts.forEach { contact ->
            array.put(JSONObject()
                .put("name", contact.name)
                .put("fingerprint", contact.fingerprintSha256)
                .put("publicKey", contact.publicKeySpkiBase64Url))
        }
        check(prefs.edit().putString(DATA, encrypt(array.toString())).commit()) { "CONTACT_SAVE_FAILED" }
    }

    private fun decode(plain: String?): List<Contact> {
        if (plain.isNullOrEmpty()) return emptyList()
        val array = JSONArray(plain)
        return (0 until array.length()).map { index ->
            val item = array.getJSONObject(index)
            Contact(item.getString("name"), item.getString("fingerprint"), item.getString("publicKey"))
        }
    }

    private fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val encrypted = cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
        val iv = cipher.iv
        val combined = ByteBuffer.allocate(1 + iv.size + encrypted.size)
            .put(iv.size.toByte()).put(iv).put(encrypted).array()
        return Base64.encodeToString(combined, Base64.NO_WRAP)
    }

    private fun decrypt(encoded: String?): String? {
        if (encoded.isNullOrEmpty()) return null
        val combined = Base64.decode(encoded, Base64.NO_WRAP)
        val buffer = ByteBuffer.wrap(combined)
        val ivLength = buffer.get().toInt() and 0xff
        require(ivLength == 12 && buffer.remaining() > ivLength + 16) { "CONTACT_DATA_INVALID" }
        val iv = ByteArray(ivLength).also { buffer.get(it) }
        val encrypted = ByteArray(buffer.remaining()).also { buffer.get(it) }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
        return String(cipher.doFinal(encrypted), Charsets.UTF_8)
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEY_STORE)
        generator.init(KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build())
        return generator.generateKey()
    }

    private companion object {
        const val PREFS = "ezero_local_friend_vault"
        const val DATA = "encrypted_contacts_v1"
        const val KEY_ALIAS = "ezero.friend.contacts.aes.v1"
        const val ANDROID_KEY_STORE = "AndroidKeyStore"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
