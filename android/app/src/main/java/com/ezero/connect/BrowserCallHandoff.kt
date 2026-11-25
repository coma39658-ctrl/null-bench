package com.ezero.connect

import java.net.URI

/**
 * Converts a verified native Accept action into a one-time browser handoff.
 * The URL is build-time configured and restricted to the known E-ZERO origins.
 * The call ID is only a locator; the browser still verifies the authenticated
 * trusted-friend invitation before it starts media.
 */
object BrowserCallHandoff {
    private val allowedHosts = setOf(
        "coma39658-ctrl.github.io",
        "ezero-connect-call-controller-preview.onrender.com"
    )
    private val callIdPattern = Regex("^[A-Za-z0-9_-]{32}$")

    fun buildUrl(baseUrl: String, callId: String, mode: String): String? {
        if (!callIdPattern.matches(callId)) return null
        val normalizedMode = mode.uppercase()
        if (normalizedMode != "AUDIO" && normalizedMode != "VIDEO") return null

        val uri = try { URI(baseUrl) } catch (_: Exception) { return null }
        if (uri.scheme != "https" || uri.host !in allowedHosts ||
            uri.rawUserInfo != null || uri.rawPath.isNullOrBlank()
        ) return null

        val fragmentAt = baseUrl.indexOf('#')
        val beforeFragment = if (fragmentAt >= 0) baseUrl.substring(0, fragmentAt) else baseUrl
        val fragment = if (fragmentAt >= 0) baseUrl.substring(fragmentAt) else ""
        val separator = if (uri.rawQuery.isNullOrEmpty()) "?" else "&"
        return beforeFragment + separator +
            "ezero_wake_call=" + callId +
            "&ezero_wake_mode=" + normalizedMode + fragment
    }
}
