package com.ezero.connect

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : Activity() {
    private lateinit var statusView: TextView
    private lateinit var friendsList: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = GREEN_DARK
        window.navigationBarColor = GREEN_DARK

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(22), dp(20), dp(24))
            setBackgroundColor(Color.rgb(245, 247, 244))
        }

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(22), dp(20), dp(22))
            background = rounded(GREEN_DARK, 20)
        }
        header.addView(label("E-ZERO", 29f, Color.WHITE, true))
        header.addView(label("CONNECT  •  PRIVATE COMMUNICATION", 11f, Color.rgb(224, 234, 222), true).apply {
            letterSpacing = 0.08f
            setPadding(0, dp(5), 0, 0)
        })
        root.addView(header, matchWrap())

        root.addView(label("آپ کا رابطہ مرکز", 21f, TEXT_DARK, true).apply {
            setPadding(0, dp(24), 0, dp(5))
        })
        root.addView(label("دوست کا E-ZERO QR گیلری یا کیمرے سے اسکین کریں۔", 14f, TEXT_MUTED, false))

        root.addView(label("دوست شامل کریں", 17f, TEXT_DARK, true).apply {
            setPadding(0, dp(22), 0, dp(10))
        })

        val galleryButton = actionButton("گیلری سے QR منتخب کریں", GREEN_DARK) {
            val pick = Intent(Intent.ACTION_GET_CONTENT).apply { type = "image/*" }
            @Suppress("DEPRECATION")
            startActivityForResult(Intent.createChooser(pick, "Choose QR image"), REQUEST_QR_IMAGE)
        }
        root.addView(galleryButton, matchWrap())

        val cameraButton = actionButton("کیمرہ سے QR اسکین کریں", Color.rgb(65, 88, 67)) {
            startActivityForResult(Intent(this@MainActivity, QrCameraScanActivity::class.java), REQUEST_QR_CAMERA)
        }
        val cameraParams = matchWrap()
        cameraParams.topMargin = dp(10)
        root.addView(cameraButton, cameraParams)

        val websiteButton = actionButton("ویب سائٹ ورژن کھولیں", GREEN_DARK) {
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(WEBSITE_URL)))
            } catch (_: Exception) {
                statusView.text = "ویب سائٹ نہیں کھل سکی۔ انٹرنیٹ کنکشن چیک کریں۔"
            }
        }
        val websiteParams = matchWrap()
        websiteParams.topMargin = dp(10)
        root.addView(websiteButton, websiteParams)

        val statusCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(15), dp(16), dp(15))
            background = rounded(Color.WHITE, 16)
        }
        statusCard.addView(label("سیکیورٹی اور حالت", 15f, TEXT_DARK, true))
        statusView = label(
            "E-ZERO Connect — الگ تھلگ ٹیسٹ ورژن۔\nQR کی تصدیق شناختی ثبوت ہے؛ اس سے دوست خودکار طور پر محفوظ نہیں ہوتا۔\nکال/پیغام کی مکمل ترسیل ابھی منسلک نہیں۔",
            13f, TEXT_MUTED, false
        ).apply { setPadding(0, dp(8), 0, 0) }
        statusCard.addView(statusView, matchWrap())
        val statusParams = matchWrap()
        statusParams.topMargin = dp(20)
        root.addView(statusCard, statusParams)

        root.addView(label("محفوظ دوست", 17f, TEXT_DARK, true).apply {
            setPadding(0, dp(22), 0, dp(8))
        })
        friendsList = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(12), dp(14), dp(12))
            background = rounded(Color.WHITE, 16)
        }
        root.addView(friendsList, matchWrap())

        root.addView(label("آڈیو، ویڈیو کال اور چیٹ کے بٹن اس وقت فعال نہیں ہیں۔", 12f, TEXT_MUTED, false).apply {
            setPadding(0, dp(14), 0, 0)
        })

        setContentView(root)
        showSavedFriends()
        showLocalInstallationIdentity()
        AndroidTelecomRegistration.register(this)
        requestNotificationPermission()
        showPendingCall(intent)
    }

    private fun actionButton(title: String, color: Int, action: () -> Unit): Button =
        Button(this).apply {
            text = title
            textSize = 15f
            isAllCaps = false
            setTextColor(Color.WHITE)
            typeface = Typeface.DEFAULT_BOLD
            background = rounded(color, 14)
            setPadding(dp(12), dp(8), dp(12), dp(8))
            minHeight = dp(54)
            setOnClickListener { action() }
        }

    private fun label(value: String, size: Float, color: Int, bold: Boolean): TextView =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            if (bold) typeface = Typeface.DEFAULT_BOLD
        }

    private fun rounded(color: Int, radius: Int) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(radius).toFloat()
    }

    private fun matchWrap() = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
    )

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    @Deprecated("Uses the platform document picker result for API 24 compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (resultCode != RESULT_OK) return
        if (requestCode == REQUEST_QR_CAMERA) {
            verifyScannedToken(data?.getStringExtra(QrCameraScanActivity.EXTRA_QR_TEXT))
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
            statusView.text = "QR کی تصدیق نہیں ہو سکی۔ واضح E-ZERO QR تصویر منتخب کریں۔"
        } finally {
            bitmap?.recycle()
        }
    }

    private fun verifyScannedToken(token: String?) {
        try {
            val verified = BrowserPermanentIdentityVerifier.verify(requireNotNull(token) { "QR_EMPTY" })
            val nameInput = EditText(this).apply {
                hint = "دوست کا نام"
                inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS
                maxLines = 1
            }
            AlertDialog.Builder(this)
                .setTitle("تصدیق شدہ E-ZERO دوست")
                .setMessage("QR کی مستقل شناخت اور دستخط درست ہیں۔ دوست کو صرف آپ کی منظوری سے محفوظ کیا جائے گا۔")
                .setView(nameInput)
                .setNegativeButton("منسوخ", null)
                .setPositiveButton("محفوظ کریں") { _, _ ->
                    try {
                        FriendContactStore(this).save(
                            nameInput.text.toString(),
                            verified.fingerprintSha256,
                            verified.publicKeySpkiBase64Url
                        )
                        statusView.text = "دوست اس فون میں محفوظ ہو گیا۔\nFingerprint: ${verified.fingerprintSha256}"
                        showSavedFriends()
                    } catch (_: Exception) {
                        statusView.text = "دوست محفوظ نہیں ہو سکا۔ درست نام درج کریں اور دوبارہ کوشش کریں۔"
                    }
                }
                .show()
        } catch (_: Exception) {
            statusView.text = "QR کی تصدیق نہیں ہو سکی۔ درست E-ZERO مستقل QR استعمال کریں۔"
        }
    }

    private fun showSavedFriends() {
        friendsList.removeAllViews()
        val contacts = try { FriendContactStore(this).all() } catch (_: Exception) { emptyList() }
        if (contacts.isEmpty()) {
            friendsList.addView(label("ابھی کوئی دوست محفوظ نہیں۔", 13f, TEXT_MUTED, false))
            return
        }
        contacts.forEach { contact ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
                setPadding(0, dp(6), 0, dp(6))
            }
            val details = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            details.addView(label(contact.name, 15f, TEXT_DARK, true))
            details.addView(label(contact.fingerprintSha256.take(16) + "…", 11f, TEXT_MUTED, false))
            row.addView(details, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(actionButton("حذف", Color.rgb(150, 55, 55)) {
                AlertDialog.Builder(this)
                    .setMessage("کیا ${contact.name} کو محفوظ دوستوں سے حذف کرنا ہے؟")
                    .setNegativeButton("واپس", null)
                    .setPositiveButton("حذف کریں") { _, _ ->
                        FriendContactStore(this).delete(contact.fingerprintSha256)
                        showSavedFriends()
                    }.show()
            }, LinearLayout.LayoutParams(dp(84), dp(44)))
            friendsList.addView(row, matchWrap())
        }
    }

    /**
     * Prepare this installation's non-exportable P-256 identity locally.
     * No network request, enrollment, contact sync, or server storage occurs.
     */
    private fun showLocalInstallationIdentity() {
        try {
            val identity = AndroidInstallationIdentity.getOrCreatePublicIdentity()
            statusView.text = statusView.text.toString() +
                "\n\nاس فون کی محفوظ شناخت تیار ہے۔\nFingerprint: ${identity.fingerprintSha256}"
        } catch (_: Exception) {
            statusView.text = statusView.text.toString() +
                "\n\nاس فون کی محفوظ شناخت تیار نہیں ہو سکی۔"
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
            CallActionReceiver.ACTION_ACCEPT -> "Accept دبایا گیا؛ محفوظ کال کنکشن ابھی منسلک نہیں۔"
            CallActionReceiver.ACTION_REJECT -> "کال مسترد کر دی گئی۔"
            else -> "آنے والی کال کا ایونٹ موصول ہوا۔"
        }
        statusView.text = "E-ZERO Connect\n$status\nCall reference: $callId"
    }

    companion object {
        private const val REQUEST_QR_IMAGE = 702
        private const val REQUEST_QR_CAMERA = 703
        private const val WEBSITE_URL = "https://ezero-connect-public-preview.onrender.com/ezero-connect-app.html"
        private val GREEN_DARK = Color.rgb(52, 75, 53)
        private val TEXT_DARK = Color.rgb(36, 47, 38)
        private val TEXT_MUTED = Color.rgb(91, 103, 93)
    }
}
