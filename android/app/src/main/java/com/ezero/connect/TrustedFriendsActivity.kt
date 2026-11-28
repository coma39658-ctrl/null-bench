package com.ezero.connect

import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * Local trusted-friend screen. Import accepts only an existing Root-signed,
 * mutually approved contact bundle; it never creates a friendship by itself.
 */
class TrustedFriendsActivity : Activity() {
    private lateinit var root: LinearLayout
    private lateinit var status: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val scroll = ScrollView(this)
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 32, 28, 32)
        }
        scroll.addView(root)
        setContentView(scroll)

        root.addView(TextView(this).apply {
            text = "E-ZERO Connect — Trusted Friends"
            textSize = 22f
        })
        status = TextView(this).apply {
            text = "Only verified, mutually approved friends can be imported."
            textSize = 14f
        }
        root.addView(status)

        val bundleInput = EditText(this).apply {
            hint = "Paste Root-signed trusted-friend QR text"
            minLines = 3
            maxLines = 6
        }
        root.addView(bundleInput, matchWrap())
        root.addView(Button(this).apply {
            text = "Import verified friend"
            setOnClickListener { importBundle(bundleInput.text.toString().trim()) }
        }, matchWrap())
        root.addView(Button(this).apply {
            text = "Refresh friends"
            setOnClickListener { renderFriends() }
        }, matchWrap())

        renderFriends()
    }

    private fun importBundle(raw: String) {
        if (raw.isBlank()) {
            status.text = "Nothing imported. The QR text is empty."
            return
        }
        status.text = "Checking Root signature, expiry and mutual-friend proof…"
        Thread {
            try {
                val rootPin = AndroidRootTrustPinV1.load(this)
                    ?: throw IllegalStateException("ROOT_PIN_NOT_CONFIGURED")
                val contact = AndroidTrustedContactBundleV1.importAndSave(this, raw, rootPin)
                runOnUiThread {
                    status.text = "Verified friend saved locally: " +
                        contact.displayName.ifBlank { "E-ZERO friend" } +
                        "\nThis does not activate incoming ringing or call routing."
                    renderFriends()
                }
            } catch (error: Exception) {
                runOnUiThread {
                    status.text = "Import rejected: ${error.message ?: "INVALID_BUNDLE"}. No unverified friend was saved."
                }
            }
        }.start()
    }

    private fun renderFriends() {
        while (root.childCount > 4) root.removeViewAt(4)
        val contacts = try {
            AndroidTrustedContactBundleV1.listTrusted(this)
        } catch (_: Exception) {
            status.text = "Friend store could not be verified. No contact was displayed."
            emptyList()
        }
        if (contacts.isEmpty()) {
            root.addView(TextView(this).apply {
                text = "No verified friends saved on this phone yet."
            }, matchWrap())
            return
        }
        contacts.forEach { contact ->
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(16, 16, 16, 16)
            }
            card.addView(TextView(this).apply {
                text = contact.displayName.ifBlank { "E-ZERO friend" } +
                    "\n${contact.remoteFingerprint}\nTrust version: ${contact.trustVersion}"
                textSize = 14f
            })
            card.addView(Button(this).apply {
                text = "Block friend"
                setOnClickListener {
                    AlertDialog.Builder(this@TrustedFriendsActivity)
                        .setTitle("Block this friend?")
                        .setMessage("This blocks this saved contact on this phone. It does not revoke the other person's Root identity.")
                        .setNegativeButton("Cancel", null)
                        .setPositiveButton("Block") { _, _ ->
                            val changed = AndroidTrustedContactBundleV1.setStatus(
                                this@TrustedFriendsActivity, contact.remoteFingerprint, "BLOCKED"
                            )
                            status.text = if (changed) "Friend blocked on this phone." else "No change was made."
                            renderFriends()
                        }.show()
                }
            })
            root.addView(card, matchWrap())
        }
    }

    private fun matchWrap() = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
    )
}
