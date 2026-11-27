package com.ezero.connect

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.text.InputType
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ImageView
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.Manifest
import android.content.pm.PackageManager
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : Activity() {
    private lateinit var statusView: TextView
    private lateinit var enrollmentQrView: ImageView
    private lateinit var completeEnrollmentButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 48, 32, 32)
        }
        statusView = TextView(this).apply { textSize = 18f }
        enrollmentQrView = ImageView(this).apply {
            adjustViewBounds = true
            scaleType = ImageView.ScaleType.FIT_CENTER
            visibility = android.view.View.GONE
        }
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
        val createEnrollmentQrButton = Button(this).apply {
            text = "Create secure enrollment QR"
            isEnabled = BuildConfig.ANDROID_ENROLLMENT_WORKER_ENDPOINT.isNotBlank()
            setOnClickListener { createEnrollmentRequestQr() }
        }
        layout.addView(createEnrollmentQrButton, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        layout.addView(enrollmentQrView, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            (resources.displayMetrics.density * 280).toInt()
        ))
        completeEnrollmentButton = Button(this).apply {
            text = "Complete verified server enrollment"
            isEnabled = false
            setOnClickListener { completeServerEnrollment() }
        }
        layout.addView(completeEnrollmentButton, LinearLayout.LayoutParams(
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
                    val consumed = prefs.getStringSet(KEY_CONSUMED_CHALLENGES, emptySet()) ?: emptySet()
                    require(request.challengeId !in consumed) { "CHALLENGE_ALREADY_CONSUMED_ON_THIS_DEVICE" }
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
                    val consumed = (prefs.getStringSet(KEY_CONSUMED_CHALLENGES, emptySet()) ?: emptySet()).toMutableSet()
                    require(verified.challengeId !in consumed) { "CHALLENGE_ALREADY_CONSUMED_ON_THIS_DEVICE" }
                    consumed.add(verified.challengeId)
                    require(prefs.edit()
                        .putString(KEY_PENDING_APPROVAL, raw)
                        .putString(KEY_LAST_APPROVED_DEVICE_FP, verified.deviceFingerprint)
                        .putString(KEY_LAST_APPROVED_ROOT_FP, verified.rootFingerprint)
                        .putString(KEY_LAST_APPROVAL_AT, System.currentTimeMillis().toString())
                        .commit()) { "APPROVAL_STATE_PERSISTENCE_FAILED" }
                    completeEnrollmentButton.isEnabled = BuildConfig.ANDROID_ENROLLMENT_WORKER_ENDPOINT.isNotBlank()
                    statusView.text = "E-ZERO Root approval signature VERIFIED locally.\\n\\nRoot fingerprint: ${verified.rootFingerprint}\\nDevice fingerprint: ${verified.deviceFingerprint}\\n\\nPending request and approval are retained until the Worker confirms ENROLLED. Tap Complete verified server enrollment when the staging Worker endpoint is configured.\\n\\nStatus: ROOT_APPROVAL_VERIFIED_LOCAL_ONLY — NOT ENROLLED."
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


    private fun createEnrollmentRequestQr() {
        val endpoint = BuildConfig.ANDROID_ENROLLMENT_WORKER_ENDPOINT
        if (endpoint.isBlank()) {
            statusView.text = "Enrollment Worker endpoint is not configured. No network request was sent."
            return
        }
        statusView.text = "Requesting a short-lived secure enrollment challenge…"
        Thread {
            try {
                val identity = AndroidEnrollmentKeyStore.getOrCreatePublicIdentity()
                val raw = AndroidEnrollmentWorkerClientV1(endpoint).createRequestQr(identity)
                val bitmap = renderEnrollmentQr(raw)
                val saved = getSharedPreferences(ENROLLMENT_STATE_PREFS, MODE_PRIVATE)
                    .edit().putString(KEY_PENDING_REQUEST, raw).remove(KEY_PENDING_APPROVAL).commit()
                require(saved) { "PENDING_REQUEST_PERSISTENCE_FAILED" }
                runOnUiThread {
                    enrollmentQrView.setImageBitmap(bitmap)
                    enrollmentQrView.visibility = android.view.View.VISIBLE
                    completeEnrollmentButton.isEnabled = false
                    statusView.text = "Signed E-ZERO enrollment QR is ready.\\n\\nIt contains a 90-second one-use Worker challenge and this phone's proof-of-possession signature. Show it to the authorized Root browser, then scan the Root approval QR back on this phone.\\n\\nStatus: PENDING_ROOT_APPROVAL — NOT ENROLLED."
                }
            } catch (error: Exception) {
                runOnUiThread {
                    statusView.text = "Enrollment QR was not created: ${error.message ?: "REQUEST_FAILED"}. No enrollment was recorded."
                }
            }
        }.start()
    }

    private fun renderEnrollmentQr(raw: String): Bitmap {
        val matrix = QRCodeWriter().encode(raw, BarcodeFormat.QR_CODE, 768, 768)
        val pixels = IntArray(matrix.width * matrix.height)
        for (y in 0 until matrix.height) {
            for (x in 0 until matrix.width) {
                pixels[y * matrix.width + x] = if (matrix[x, y]) Color.BLACK else Color.WHITE
            }
        }
        return Bitmap.createBitmap(matrix.width, matrix.height, Bitmap.Config.ARGB_8888).apply {
            setPixels(pixels, 0, matrix.width, 0, 0, matrix.width, matrix.height)
        }
    }

    private fun completeServerEnrollment() {
        val endpoint = BuildConfig.ANDROID_ENROLLMENT_WORKER_ENDPOINT
        if (endpoint.isBlank()) {
            statusView.text = "Enrollment Worker endpoint is not configured. Local Root verification is not server enrollment."
            return
        }
        val prefs = getSharedPreferences(ENROLLMENT_STATE_PREFS, MODE_PRIVATE)
        val request = prefs.getString(KEY_PENDING_REQUEST, null)
        val approval = prefs.getString(KEY_PENDING_APPROVAL, null)
        if (request == null || approval == null) {
            statusView.text = "A pending enrollment request and locally verified Root approval are both required."
            return
        }
        val trustedRoot = AndroidRootTrustPinV1.load(this)
        if (trustedRoot == null) {
            statusView.text = "The independently verified Root fingerprint pin is missing. Server enrollment blocked."
            return
        }
        completeEnrollmentButton.isEnabled = false
        statusView.text = "Submitting the locally verified approval to the configured staging Worker…"
        Thread {
            try {
                val result = AndroidEnrollmentWorkerClientV1(endpoint)
                    .completeEnrollment(request, approval, trustedRoot)
                val decoded = AndroidEnrollmentQrEnvelopeV1.decodeRequest(request)
                val consumed = (prefs.getStringSet(KEY_CONSUMED_CHALLENGES, emptySet()) ?: emptySet()).toMutableSet()
                consumed.add(decoded.challengeId)
                require(prefs.edit()
                    .remove(KEY_PENDING_REQUEST)
                    .remove(KEY_PENDING_APPROVAL)
                    .putStringSet(KEY_CONSUMED_CHALLENGES, consumed)
                    .putString(KEY_LAST_APPROVED_DEVICE_FP, result.getString("device_fp"))
                    .putString(KEY_LAST_APPROVED_ROOT_FP, result.getString("root_fp"))
                    .putString(KEY_LAST_APPROVAL_AT, System.currentTimeMillis().toString())
                    .commit()) { "ENROLLMENT_STATE_PERSISTENCE_FAILED" }
                runOnUiThread {
                    enrollmentQrView.visibility = android.view.View.GONE
                    statusView.text = "E-ZERO device enrollment confirmed by Worker.\\n\\nDevice fingerprint: ${result.getString("device_fp")}\\nRoot fingerprint: ${result.getString("root_fp")}\\n\\nStatus: ENROLLED. This does not enable FCM ringing, friend trust, or WebRTC calling."
                    refreshFcmRegistrationIfEnrolled()
                }
            } catch (error: Exception) {
                runOnUiThread {
                    completeEnrollmentButton.isEnabled = true
                    statusView.text = "Worker did not confirm enrollment: ${error.message ?: "ENROLLMENT_FAILED"}. Pending evidence was retained; challenge may need a fresh request if the Worker consumed it."
                }
            }
        }.start()
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
    private fun refreshFcmRegistrationIfEnrolled() {
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token ->
                Thread {
                    AndroidFcmTokenRegistrationV1.registerIfEnrolled(this, token)
                }.start()
            }
            .addOnFailureListener {
                // No token is logged. A later app launch or Firebase token refresh retries.
            }
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
        private const val KEY_PENDING_APPROVAL = "pending_approval_qr"
        private const val KEY_CONSUMED_CHALLENGES = "consumed_challenge_ids"
        private const val KEY_LAST_APPROVED_DEVICE_FP = "last_approved_device_fp"
        private const val KEY_LAST_APPROVED_ROOT_FP = "last_approved_root_fp"
        private const val KEY_LAST_APPROVAL_AT = "last_approval_at"
    }
}
