package com.ezero.connect

import android.content.Context
import android.os.Build
import androidx.core.telecom.CallsManager

/**
 * Registers E-ZERO as an audio/video VoIP provider with Android Telecom.
 *
 * Registration alone does not create or answer calls. Incoming calls must only
 * be added after the signed invite and trusted-friend checks are integrated.
 */
internal object AndroidTelecomRegistration {
    fun register(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
        return try {
            val manager = CallsManager(context.applicationContext)
            val capabilities =
                CallsManager.CAPABILITY_BASELINE or
                    CallsManager.CAPABILITY_SUPPORTS_VIDEO_CALLING
            manager.registerAppWithTelecom(capabilities)
            true
        } catch (_: Exception) {
            false
        }
    }
}
