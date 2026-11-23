package com.ezero.connect

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RectF
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.FocusMeteringAction
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.zxing.BinaryBitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.DecodeHintType
import com.google.zxing.MultiFormatReader
import com.google.zxing.LuminanceSource
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.ReaderException
import com.google.zxing.common.HybridBinarizer
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/** Full-screen, WhatsApp-style camera QR scanner. MainActivity verifies the identity token. */
class QrCameraScanActivity : ComponentActivity() {
    private lateinit var previewView: PreviewView
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var statusText: TextView
    private lateinit var torchButton: TextView
    private var camera: Camera? = null
    private var torchEnabled = false
    private val delivered = AtomicBoolean(false)

    private val cameraPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startCamera() else {
            setResult(RESULT_CANCELED)
            finish()
        }
    }

    private val reader = MultiFormatReader().apply {
        setHints(mapOf(
            DecodeHintType.POSSIBLE_FORMATS to listOf(BarcodeFormat.QR_CODE),
            DecodeHintType.TRY_HARDER to true,
            DecodeHintType.ALSO_INVERTED to true
        ))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.BLACK
        window.navigationBarColor = Color.BLACK
        cameraExecutor = Executors.newSingleThreadExecutor()
        previewView = PreviewView(this).apply {
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }

        statusText = textView(
            "QR کو فریم کے اندر رکھیں — خودکار اسکین ہوگا",
            14f, Color.WHITE, false
        ).apply { gravity = Gravity.CENTER }

        torchButton = control("⚡ ٹارچ آن") { toggleTorch() }
        val closeButton = control("✕ بند کریں") { finish() }

        val topBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(18), dp(12), dp(18), dp(12))
            setBackgroundColor(0x99000000.toInt())
            addView(textView("E-ZERO QR اسکینر", 18f, Color.WHITE, true),
                LinearLayout.LayoutParams(0, dp(48), 1f))
            addView(closeButton, LinearLayout.LayoutParams(dp(104), dp(48)))
        }

        val bottomBar = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(18), dp(18), dp(18), dp(28))
            setBackgroundColor(0xCC000000.toInt())
            addView(statusText, matchWrap())
            addView(torchButton, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(52)
            ).apply { topMargin = dp(14) })
            addView(textView("بہتر نتیجے کے لیے QR کو سیدھا رکھیں اور روشنی مناسب رکھیں",
                12f, 0xFFE0E0E0.toInt(), false).apply {
                gravity = Gravity.CENTER
                setPadding(0, dp(10), 0, 0)
            }, matchWrap())
        }

        setContentView(FrameLayout(this).apply {
            addView(previewView, FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            addView(QrScannerOverlayView(this@QrCameraScanActivity),
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            addView(topBar, FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.TOP))
            addView(bottomBar, FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM))
        })

        previewView.setOnTouchListener { _, event ->
            if (event.action == android.view.MotionEvent.ACTION_UP) focusAt(event.x, event.y)
            true
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED) startCamera()
        else cameraPermission.launch(Manifest.permission.CAMERA)
    }

    private fun startCamera() {
        val providerFuture = ProcessCameraProvider.getInstance(this)
        providerFuture.addListener({
            if (isFinishing || isDestroyed) return@addListener
            val provider = providerFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }
            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build().also {
                    it.setAnalyzer(cameraExecutor) { image -> analyze(image) }
                }
            try {
                provider.unbindAll()
                camera = provider.bindToLifecycle(
                    this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis
                )
                previewView.post {
                    focusAt(previewView.width / 2f, previewView.height / 2f)
                }
                statusText.text = "کیمرہ تیار ہے — QR فریم کے اندر لائیں"
            } catch (_: Exception) {
                statusText.text = "کیمرہ شروع نہیں ہو سکا۔ اجازت اور کیمرہ چیک کریں۔"
                setResult(RESULT_CANCELED)
                finish()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun focusAt(x: Float, y: Float) {
        val activeCamera = camera ?: return
        try {
            val point = previewView.meteringPointFactory.createPoint(x, y)
            val action = FocusMeteringAction.Builder(point)
                .setAutoCancelDuration(3, TimeUnit.SECONDS)
                .build()
            activeCamera.cameraControl.startFocusAndMetering(action)
        } catch (_: Exception) {
            // Some camera providers do not expose tap-to-focus; QR analysis continues.
        }
    }

    private fun toggleTorch() {
        val activeCamera = camera ?: run {
            statusText.text = "کیمرہ ابھی تیار نہیں"
            return
        }
        val hasFlash = activeCamera.cameraInfo.hasFlashUnit()
        if (!hasFlash) {
            statusText.text = "اس کیمرے میں ٹارچ دستیاب نہیں"
            return
        }
        torchEnabled = !torchEnabled
        activeCamera.cameraControl.enableTorch(torchEnabled)
        torchButton.text = if (torchEnabled) "⚡ ٹارچ بند" else "⚡ ٹارچ آن"
    }

    private fun analyze(image: ImageProxy) {
        try {
            if (delivered.get() || image.planes.isEmpty()) return
            val plane = image.planes[0]
            val width = image.width
            val height = image.height
            val rowStride = plane.rowStride
            val pixelStride = plane.pixelStride
            if (width <= 0 || height <= 0 ||
                width.toLong() * height.toLong() > MAX_FRAME_PIXELS) return

            val sourceBytes = plane.buffer.duplicate()
            val bufferPosition = sourceBytes.position()
            val yuv = ByteArray(width * height)
            for (row in 0 until height) {
                val rowStart = bufferPosition + row * rowStride
                val outStart = row * width
                for (col in 0 until width) {
                    yuv[outStart + col] = sourceBytes.get(rowStart + col * pixelStride)
                }
            }

            var source: LuminanceSource =
                PlanarYUVLuminanceSource(yuv, width, height, 0, 0, width, height, false)
            val turns = (image.imageInfo.rotationDegrees / 90) % 4
            repeat(turns) { source = source.rotateCounterClockwise() }

            val result = try {
                reader.decodeWithState(BinaryBitmap(HybridBinarizer(source)))
            } catch (_: ReaderException) {
                null
            } finally {
                reader.reset()
            }
            val token = result?.text
            if (!token.isNullOrBlank() && delivered.compareAndSet(false, true)) {
                runOnUiThread {
                    statusText.text = "QR مل گیا — شناخت کی تصدیق ہو رہی ہے"
                    setResult(RESULT_OK, intent.putExtra(EXTRA_QR_TEXT, token))
                    finish()
                }
            }
        } catch (_: Exception) {
            // Ignore malformed frames; the next camera frame may still decode.
        } finally {
            image.close()
        }
    }

    private fun control(title: String, action: () -> Unit) = TextView(this).apply {
        text = title
        textSize = 14f
        gravity = Gravity.CENTER
        setTextColor(Color.WHITE)
        setPadding(dp(8), 0, dp(8), 0)
        setBackgroundColor(0xFF35543A.toInt())
        setOnClickListener { action() }
    }

    private fun textView(value: String, size: Float, color: Int, bold: Boolean) =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            if (bold) typeface = android.graphics.Typeface.DEFAULT_BOLD
        }

    private fun matchWrap() = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
    )

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        try { camera?.cameraControl?.enableTorch(false) } catch (_: Exception) {}
        if (::cameraExecutor.isInitialized) cameraExecutor.shutdown()
        super.onDestroy()
    }

    private class QrScannerOverlayView(context: android.content.Context) : View(context) {
        private val dimPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0x99000000.toInt()
        }
        private val clearPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            xfermode = PorterDuffXfermode(PorterDuff.Mode.CLEAR)
        }
        private val cornerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF71D889.toInt()
            style = Paint.Style.STROKE
            strokeWidth = context.resources.displayMetrics.density * 5f
            strokeCap = Paint.Cap.ROUND
        }

        init { setLayerType(LAYER_TYPE_SOFTWARE, null) }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val side = minOf(width * 0.78f, height * 0.43f)
            val left = (width - side) / 2f
            val top = (height - side) / 2f
            val frame = RectF(left, top, left + side, top + side)
            canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), dimPaint)
            canvas.drawRoundRect(frame, 22f, 22f, clearPaint)
            val length = side * 0.19f
            val radius = 22f
            // Four bright corner guides around a large transparent camera window.
            canvas.drawLine(left, top + length, left, top + radius, cornerPaint)
            canvas.drawLine(left + radius, top, left + length, top, cornerPaint)
            canvas.drawLine(frame.right - length, top, frame.right - radius, top, cornerPaint)
            canvas.drawLine(frame.right, top + radius, frame.right, top + length, cornerPaint)
            canvas.drawLine(left, frame.bottom - length, left, frame.bottom - radius, cornerPaint)
            canvas.drawLine(left + radius, frame.bottom, left + length, frame.bottom, cornerPaint)
            canvas.drawLine(frame.right - length, frame.bottom, frame.right - radius, frame.bottom, cornerPaint)
            canvas.drawLine(frame.right, frame.bottom - radius, frame.right, frame.bottom - length, cornerPaint)
        }
    }

    companion object {
        const val EXTRA_QR_TEXT = "com.ezero.connect.EXTRA_QR_TEXT"
        private const val MAX_FRAME_PIXELS = 8_000_000L
    }
}
