package com.ezero.connect

import android.content.Context

/**
 * Registers FCM tokens only after this installation has a Worker-confirmed
 * enrollment record. No token, signature, or response body is logged.
 */
internal object AndroidFcmTokenRegistrationV1 {
    private const val PREFS = "ezero_android_enrollment_state_v1"
    private const val KEY_DEVICE_FP = "last_approved_device_fp"
    private const val KEY_ROOT_FP = "last_approved_root_fp"

    fun registerIfEnrolled(context: Context, token: String): Boolean {
        val endpoint = BuildConfig.ANDROID_ENROLLMENT_WORKER_ENDPOINT
        if (endpoint.isBlank()) return false
        return try {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val enrolledDeviceFp = prefs.getString(KEY_DEVICE_FP, null) ?: return false
            val enrolledRootFp = prefs.getString(KEY_ROOT_FP, null) ?: return false
            if (!enrolledRootFp.matches(Regex("^[a-f0-9]{64}$"))) return false

            val identity = AndroidEnrollmentKeyStore.getOrCreatePublicIdentity()
            if (identity.fingerprint != enrolledDeviceFp) return false

            AndroidEnrollmentWorkerClientV1(endpoint).registerFcmToken(identity, token)
            true
        } catch (_: Exception) {
            false
        }
    }
}
