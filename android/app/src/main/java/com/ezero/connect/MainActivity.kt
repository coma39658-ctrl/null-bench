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
                    val request = AndroidEnrollmentQrEnvelopeV1.decodeRequest(raw)
                    val localIdentity = AndroidEnrollmentKeyStore.getOrCreatePublicIdentity()
                    require(request.deviceFp == localIdentity.fingerprint) { "REQUEST_IS_NOT_FOR_THIS_DEVICE" }
                    val prefs = getSharedPreferences(ENROLLMENT_STATE_PREFS, MODE_PRIVATE)
                    require(prefs.getString(KEY_CONSUMED_CHALLENGE, null) != request.challengeId) {
                        "CHALLENGE_ALREADY_CONSUMED_ON_THIS_DEVICE"
                    }
                    require(prefs.edit().putString(KEY_PENDING_REQUEST, raw).commit()) {
                        "PENDING_REQUEST_PERSISTENCE_FAILED"
                    }
                    statusView.text = "E-ZERO enrollment request validated and saved on this phone.\\n\\nDevice proof is checked when the Root approval arrives. Keep this pending request active and scan the Root approval QR on this same phone.\\n\\nStatus: PENDING_ROOT_APPROVAL — NOT ENROLLED."
                } catch (error: Exception) {
                    statusView.text = "Enrollment request rejected: " + (error.message ?: "INVALID_REQUEST") + ". No trust was created."
                }
            }
            AndroidQrPayloadRouter.Kind.ENROLLMENT_APPROVAL -> {
                try {
                    val pending = getSharedPreferences(ENROLLMENT_STATE_PREFS, MODE_PRIVATE)
                        .getString(KEY_PENDING_REQUEST, null)
                        ?: throw IllegalStateException("PENDING_REQUEST_NOT_FOUND")
                    val trustedRoot = AndroidRootTrustPinV1.load(this)
                        ?: throw IllegalStateException("ROOT_PIN_NOT_CONFIGURED")
                    val verified = AndroidEnrollmentApprovalGateV1.verify(pending, raw, trustedRoot)
                    val prefs = getSharedPreferences(ENROLLMENT_STATE_PREFS, MODE_PRIVATE)
                    require(prefs.getString(KEY_CONSUMED_CHALLENGE, null) != verified.challengeId) {
                        "CHALLENGE_ALREADY_CONSUMED_ON_THIS_DEVICE"
                    }
                    require(prefs.edit()
                        .remove(KEY_PENDING_REQUEST)
                        .putString(KEY_CONSUMED_CHALLENGE, verified.challengeId)
                        .putString(KEY_LAST_APPROVED_DEVICE_FP, verified.deviceFingerprint)
                        .putString(KEY_LAST_APPROVED_ROOT_FP, verified.rootFingerprint)
                        .putString(KEY_LAST_APPROVAL_AT, System.currentTimeMillis().toString())
                        .commit()) { "APPROVAL_STATE_PERSISTENCE_FAILED" }
                    statusView.text = "E-ZERO Root approval signature VERIFIED on this phone.\\n\\nRoot fingerprint: ${verified.rootFingerprint}\\nDevice fingerprint: ${verified.deviceFingerprint}\\n\\nStatus: ROOT_APPROVAL_VERIFIED_LOCAL_ONLY.\\nServer enrollment, friend trust, FCM registration, and call permission are NOT active yet."
                } catch (error: Exception) {
                    statusView.text = "Root approval rejected: " + (error.message ?: "APPROVAL_INVALID") + ". Pending enrollment remains untrusted."
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
        private const val ENROLLMENT_STATE_PREFS = "ezero_android_enrollment_state_v1"
        private const val KEY_PENDING_REQUEST = "pending_request_qr"
        private const val KEY_CONSUMED_CHALLENGE = "last_consumed_challenge_id"
        private const val KEY_LAST_APPROVED_DEVICE_FP = "last_approved_device_fp"
        private const val KEY_LAST_APPROVED_ROOT_FP = "last_approved_root_fp"
        private const val KEY_LAST_APPROVAL_AT = "last_approval_at"
    }
}
