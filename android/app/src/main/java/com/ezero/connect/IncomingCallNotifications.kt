package com.ezero.connect

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person

object IncomingCallNotifications {
    private const val CHANNEL_ID = "ezero_incoming_calls_v1"

    fun show(context: Context, callId: String, mode: String, callerAlias: String, expiresAt: Long) {
        if (expiresAt <= System.currentTimeMillis()) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureChannel(context, manager)

        val person = Person.Builder().setName(callerAlias).setImportant(true).build()
        val accept = actionPendingIntent(context, CallActionReceiver.ACTION_ACCEPT, callId, 1)
        val reject = actionPendingIntent(context, CallActionReceiver.ACTION_REJECT, callId, 2)
        val content = PendingIntent.getActivity(
            context, 3,
            Intent(context, MainActivity::class.java).putExtra(CallActionReceiver.EXTRA_CALL_ID, callId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.sym_action_call)
            .setContentTitle(if (mode == "VIDEO") "Incoming video call" else "Incoming audio call")
            .setContentText(callerAlias)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setTimeoutAfter((expiresAt - System.currentTimeMillis()).coerceAtMost(120_000L))
            .setContentIntent(content)
            .setStyle(
                NotificationCompat.CallStyle.forIncomingCall(person, reject, accept)
                    .setIsVideo(mode == "VIDEO")
            )

        // Android 14+ may deny full-screen intents. Use one only when system policy allows it.
        if (Build.VERSION.SDK_INT < 34 || manager.canUseFullScreenIntent()) {
            builder.setFullScreenIntent(content, true)
        }
        val notification = builder.build()

        // Android 13+ requires runtime permission. Never crash if permission is absent.
        if (NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            try {
                NotificationManagerCompat.from(context).notify(notificationId(callId), notification)
            } catch (_: SecurityException) {
                // Permission can be revoked between the check and notify call.
            }
        }
    }

    fun cancel(context: Context, callId: String) {
        NotificationManagerCompat.from(context).cancel(notificationId(callId))
    }

    private fun ensureChannel(context: Context, manager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            manager.getNotificationChannel(CHANNEL_ID) == null
        ) {
            val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            val audio = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            val channel = NotificationChannel(
                CHANNEL_ID, "Incoming calls", NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts for trusted E-ZERO incoming calls"
                setSound(sound, audio)
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(channel)
        }
    }

    private fun actionPendingIntent(
        context: Context, action: String, callId: String, requestCode: Int
    ): PendingIntent {
        val intent = Intent(context, CallActionReceiver::class.java).apply {
            this.action = action
            putExtra(CallActionReceiver.EXTRA_ACTION, action)
            putExtra(CallActionReceiver.EXTRA_CALL_ID, callId)
        }
        return PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun notificationId(callId: String): Int = callId.hashCode()
}
