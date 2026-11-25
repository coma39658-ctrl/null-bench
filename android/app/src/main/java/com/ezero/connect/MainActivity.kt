package com.ezero.connect

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.text.InputType
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.Manifest
import android.content.pm.PackageManager

class MainActivity : Activity() {
    private lateinit var statusView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 48, 32, 32)
        }
        statusView = TextView(this).apply { textSize = 18f }
        val galleryButton = Button(this).apply {
            text = "Read E-ZERO QR from gallery"
            setOnClickListener {
                val pick = Intent(Intent.ACTION_GET_CONTENT).apply { type = "image/*" }
                @Suppress("DEPRECATION")
                startActivityForResult(Intent.createChooser(pick, "Choose QR image"), REQUEST_QR_IMAGE)
            }
        }
        layout.addView(statusView, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        val prepareEnrollmentButton = Button(this).apply {
            text = "Prepare this phone for secure enrollment"
            setOnClickListener {
                try {
                    val identity = AndroidEnrollmentKeyStore.getOrCreatePublicIdentity()
                    statusView.text = buildString {
                        append("E-ZERO Connect — Android enrollment preparation\n\n")
                        append("Device fingerprint (SHA-256):\n")
                        append(identity.fingerprint)
                        append("\n\nStatus: KEY_CREATED_NOT_ENROLLED")
                        append("\nPrivate key remains inside Android Keystore.")
                        append("\nNo server connection or friend trust has been created.")
                        append("\nRoot approval is still required.")
                    }
                } catch (_: Exception) {
                    statusView.text = "Secure device key could not be prepared on this phone."
                }
            }
        }
        layout.addView(prepareEnrollmentButton, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        val rootPinButton = Button(this).apply {
            text = "Verify and save E-ZERO Root fingerprint"
            setOnClickListener { showRootPinDialog() }
        }
        layout.addView(rootPinButton, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        layout.addView(galleryButton, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        val cameraButton = Button(this).apply {
            text = "Scan E-ZERO QR with camera"
            setOnClickListener {
                startActivityForResult(Intent(this@MainActivity, QrCameraScanActivity::class.java), REQUEST_QR_CAMERA)
            }
        }
        layout.addView(cameraButton, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        setContentView(layout)

        val telecomReady = AndroidTelecomRegistration.register(this)
        statusView.text = buildString {
            append("E-ZERO Connect\n\nAndroid incoming-call host — isolated staging.")
            append("\nAndroid Telecom registration: ")
            append(if (telecomReady) "registered" else "unavailable on this device")
            append("\nPush setup and secure WebRTC handoff are not active yet.")
            append("\n\nA verified QR is identity evidence only; it does not enroll or trust a friend.")
        }
        requestNotificationPermission()
        showPendingCall(intent)
    }

    @Deprecated("Uses the platform document picker result for API 24 compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (resultCode != RESULT_OK) return
        if (requestCode == REQUEST_QR_CAMERA) {
            val token = data?.getStringExtra(QrCameraScanActivity.EXTRA_QR_TEXT)
            verifyScannedToken(token)
            return
        }
        if (requestCode != REQUEST_QR_IMAGE) return
        val uri = data?.data ?: return
        var bitmap: Bitmap? = null
        try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            contentResolver.openInputStream(uri).use { stream ->
                requireNotNull(stream) { "IMAGE_OPEN_FAILED" }
                BitmapFactory.decodeStream(stream, null, bounds)
            }
            val sample = QrImageDecodePolicy.sampleSize(bounds.outWidth, bounds.outHeight)
            val options = BitmapFactory.Options().apply { inSampleSize = sample }
            contentResolver.openInputStream(uri).use { stream ->
                requireNotNull(stream) { "IMAGE_OPEN_FAILED" }
                bitmap = BitmapFactory.decodeStream(stream, null, options)
            }
            val decoded = requireNotNull(bitmap) { "IMAGE_DECODE_FAILED" }
            verifyScannedToken(BrowserQrImageReader.read(decoded))
        } catch (_: Exception) {
            statusView.text = "QR not verified. Choose a clear E-ZERO permanent QR image."
        } finally {
            bitmap?.recycle()
        }
    }

    private fun verifyScannedToken(token: String?) {
        val raw = token ?: run {
            statusView.text = "QR not verified. No QR data was received."
            return
        }
        when (AndroidQrPayloadRouter.classify(raw)) {
            AndroidQrPayloadRouter.Kind.ENROLLMENT_REQUEST -> {
                try {
                    AndroidEnrollmentQrEnvelopeV1.decodeRequest(raw)
                    statusView.text = "E-ZERO Android enrollment request QR format is valid.\n\nScan this request with the already-authorized browser Root device. Scanning does not enroll or trust this phone."
                } catch (_: Exception) {
                    statusView.text = "Android enrollment request QR is malformed or expired. No trust was created."
                }
            }
            AndroidQrPayloadRouter.Kind.ENROLLMENT_APPROVAL -> {
                try {
                    AndroidEnrollmentQrEnvelopeV1.decodeApproval(raw)
                    statusView.text = "E-ZERO enrollment approval QR format is valid only.\n\nRoot signature verification and matching a live pending challenge are not connected yet. This phone is NOT enrolled or trusted."
                } catch (_: Exception) {
                    statusView.text = "Android enrollment approval QR is malformed or expired. No trust was created."
                }
            }
            AndroidQrPayloadRouter.Kind.INVALID_ENROLLMENT -> {
                statusView.text = "Unrecognized Android enrollment QR version. No trust was created."
            }
            AndroidQrPayloadRouter.Kind.PERMANENT_QR_CANDIDATE -> {
                try {
                    val verified = BrowserPermanentIdentityVerifier.verify(raw)
                    statusView.text = buildString {
                        append("E-ZERO permanent QR verified.\n")
                        append("Fingerprint: ")
                        append(verified.fingerprintSha256)
                        append("\n\nThis only verifies the QR signature. Friend enrollment and call permission are not active.")
                    }
                } catch (_: Exception) {
                    statusView.text = "QR not verified. Use a clear, valid E-ZERO permanent QR."
                }
            }
        }
    }

    private fun showRootPinDialog() {
        val fields = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 12, 40, 0)
        }
        fun field(label: String, multiLine: Boolean = false): EditText {
            fields.addView(TextView(this).apply { text = label })
            return EditText(this).apply {
                inputType = if (multiLine) {
                    InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                } else {
                    InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                }
                if (multiLine) minLines = 3
                setTextIsSelectable(true)
            }.also { fields.addView(it) }
        }
        val spkiInput = field("Root Public SPKI (Base64URL)", true)
        val fingerprintInput = field("Root SHA-256 fingerprint (64 lowercase hex)")
        val confirmationInput = field("Independently checked fingerprint (type after separate comparison)")
        AlertDialog.Builder(this)
            .setTitle("First-use E-ZERO Root trust")
            .setMessage("Paste only public SPKI and fingerprint from the authorized Root browser. Compare all 64 fingerprint characters through a separate trusted channel before confirming. Never paste a private key.")
            .setView(fields)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Verify and save") { _, _ ->
                try {
                    val pin = AndroidRootTrustPinV1.pinAfterIndependentConfirmation(
                        this,
                        spkiInput.text.toString().trim(),
                        fingerprintInput.text.toString().trim(),
                        confirmationInput.text.toString().trim()
                    )
                    statusView.text = "E-ZERO Root public key pinned on this phone.\nFingerprint: " + pin.fingerprint + "\nThis is only a local trust pin; server enrollment, friend trust, and calls are not enabled."
                } catch (error: Exception) {
                    statusView.text = "Root pin rejected: " + (error.message ?: "VALIDATION_FAILED") + ". No Root trust was saved."
                }
            }
            .show()
    }
    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 701)
        }
    }

    private fun showPendingCall(intent: Intent?) {
        val action = intent?.getStringExtra(CallActionReceiver.EXTRA_ACTION) ?: return
        val callId = intent.getStringExtra(CallActionReceiver.EXTRA_CALL_ID) ?: "unknown"
        val status = when (action) {
            CallActionReceiver.ACTION_ACCEPT -> "Accept tapped. Secure invite handoff is not integrated yet."
            CallActionReceiver.ACTION_REJECT -> "Call rejected."
            else -> "Incoming call event received."
        }
        statusView.text = "E-ZERO Connect\n\n$status\nCall reference: $callId"
    }

    companion object {
        private const val REQUEST_QR_IMAGE = 702
        private const val REQUEST_QR_CAMERA = 703
    }
}
