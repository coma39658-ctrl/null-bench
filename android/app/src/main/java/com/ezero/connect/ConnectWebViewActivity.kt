package com.ezero.connect

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.SafeBrowsingResponse
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

/**
 * Isolated staging host for the existing Connect page.
 * No addJavascriptInterface bridge is exposed. Navigation is restricted to the
 * single reviewed entry URL; media permission is granted only after a page
 * getUserMedia request and Android runtime permission.
 */
class ConnectWebViewActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var status: TextView
    private var pendingMediaRequest: PermissionRequest? = null
    private var pendingResources: Array<String> = emptyArray()

    private val mediaPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            val request = pendingMediaRequest
            val resources = pendingResources
            pendingMediaRequest = null
            pendingResources = emptyArray()
            if (request == null) return@registerForActivityResult

            val allGranted = resources.all { resource ->
                when (resource) {
                    PermissionRequest.RESOURCE_VIDEO_CAPTURE ->
                        result[Manifest.permission.CAMERA] == true ||
                            ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                    PermissionRequest.RESOURCE_AUDIO_CAPTURE ->
                        result[Manifest.permission.RECORD_AUDIO] == true ||
                            ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                    else -> false
                }
            }
            if (allGranted) request.grant(resources) else request.deny()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WebView.setWebContentsDebuggingEnabled(false)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        status = TextView(this).apply {
            text = "E-ZERO Connect محفوظ Staging صفحہ"
            textSize = 14f
            setPadding(20, 14, 20, 14)
        }
        root.addView(status, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ))

        webView = WebView(this)
        configureWebView()
        root.addView(webView, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
        ))
        setContentView(root)

        if (!ConnectWebOriginPolicyV1.isAllowed(ConnectWebOriginPolicyV1.ENTRY_URL)) {
            status.text = "محفوظ URL پالیسی ناکام — صفحہ نہیں کھولا گیا"
            finish()
            return
        }
        webView.loadUrl(ConnectWebOriginPolicyV1.ENTRY_URL)
    }

    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mediaPlaybackRequiresUserGesture = true
            safeBrowsingEnabled = true
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return true
                return !ConnectWebOriginPolicyV1.isAllowed(url)
            }

            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: android.net.http.SslError?) {
                handler?.cancel()
                status.text = "TLS سرٹیفکیٹ کی تصدیق ناکام — رابطہ روک دیا گیا"
            }

            override fun onSafeBrowsingHit(
                view: WebView?,
                request: WebResourceRequest?,
                threatType: Int,
                callback: SafeBrowsingResponse
            ) {
                callback.backToSafety(true)
                status.text = "Safe Browsing نے خطرناک صفحہ روک دیا"
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { handleMediaPermissionRequest(request) }
            }

            override fun onPermissionRequestCanceled(request: PermissionRequest) {
                if (pendingMediaRequest === request) {
                    pendingMediaRequest = null
                    pendingResources = emptyArray()
                }
            }

            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: android.os.Message?
            ): Boolean = false
        }
    }

    private fun handleMediaPermissionRequest(request: PermissionRequest) {
        if (!ConnectWebOriginPolicyV1.isAllowedOrigin(request.origin.toString())) {
            request.deny()
            return
        }
        if (pendingMediaRequest != null) {
            request.deny()
            return
        }
        val resources = request.resources?.distinct()?.toTypedArray() ?: emptyArray()
        if (resources.isEmpty() || resources.any {
                it != PermissionRequest.RESOURCE_VIDEO_CAPTURE &&
                    it != PermissionRequest.RESOURCE_AUDIO_CAPTURE
            }) {
            request.deny()
            return
        }

        val permissions = buildList {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE in resources &&
                ContextCompat.checkSelfPermission(this@ConnectWebViewActivity, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED
            ) add(Manifest.permission.CAMERA)
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE in resources &&
                ContextCompat.checkSelfPermission(this@ConnectWebViewActivity, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED
            ) add(Manifest.permission.RECORD_AUDIO)
        }
        if (permissions.isEmpty()) {
            request.grant(resources)
            return
        }
        pendingMediaRequest = request
        pendingResources = resources
        mediaPermissionLauncher.launch(permissions.toTypedArray())
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        pendingMediaRequest?.deny()
        pendingMediaRequest = null
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }
}
