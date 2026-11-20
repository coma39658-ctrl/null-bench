package com.ezero.connect

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class CallActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val callId = intent.getStringExtra(EXTRA_CALL_ID) ?: return
        val action = intent.getStringExtra(EXTRA_ACTION) ?: intent.action ?: return
        if (action != ACTION_ACCEPT && action != ACTION_REJECT) return

        IncomingCallNotifications.cancel(context, callId)
        val open = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_ACTION, action)
            putExtra(EXTRA_CALL_ID, callId)
        }
        context.startActivity(open)
    }

    companion object {
        const val ACTION_ACCEPT = "com.ezero.connect.ACCEPT_CALL"
        const val ACTION_REJECT = "com.ezero.connect.REJECT_CALL"
        const val EXTRA_ACTION = "ezero_call_action"
        const val EXTRA_CALL_ID = "ezero_call_id"
    }
}
