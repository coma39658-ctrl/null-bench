package com.ezero.connect

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.widget.Button
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
            text = "Verify friend's permanent QR from gallery"
            setOnClickListener {
                val pick = Intent(Intent.ACTION_GET_CONTENT).apply { type = "image/*" }
                @Suppress("DEPRECATION")
                startActivityForResult(Intent.createChooser(pick, "Choose QR image"), REQUEST_QR_IMAGE)
            }
        }
        layout.addView(statusView, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        layout.addView(galleryButton, LinearLayout.LayoutParams(
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
        if (requestCode != REQUEST_QR_IMAGE || resultCode != RESULT_OK) return
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
            val token = BrowserQrImageReader.read(decoded)
            val verified = BrowserPermanentIdentityVerifier.verify(token)
            statusView.text = buildString {
                append("E-ZERO permanent QR verified.\n")
                append("Fingerprint: ")
                append(verified.fingerprintSha256)
                append("\n\nThis only verifies the QR signature. Friend enrollment and call permission are not active.")
            }
        } catch (_: Exception) {
            statusView.text = "QR not verified. Choose a clear E-ZERO permanent QR image."
        } finally {
            bitmap?.recycle()
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
    }
}
