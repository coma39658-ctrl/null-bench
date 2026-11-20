package com.ezero.connect

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val message = TextView(this).apply {
            textSize = 18f
            setPadding(32, 48, 32, 32)
            text = "E-ZERO Connect\\n\\nAndroid incoming-call host — isolated staging.\\nPush setup and secure WebRTC handoff are not active yet."
        }
        setContentView(message)
        requestNotificationPermission()
        showPendingCall(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        showPendingCall(intent)
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
        // Intentionally do not auto-answer or fabricate a connected-call state.
        (findViewById<TextView>(android.R.id.content).getChildAt(0) as? TextView)?.text =
            "E-ZERO Connect\\n\\n$status\\nCall reference: $callId"
    }
}
