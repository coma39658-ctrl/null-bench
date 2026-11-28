package com.ezero.connect

import java.net.URI

/**
 * Exact allowlist for the first native WebView handoff.
 * This policy deliberately authorizes one immutable staging page only.
 * It does not enable JavaScript bridges or grant camera/microphone access.
 */
internal object ConnectWebOriginPolicyV1 {
    const val ENTRY_URL =
        "https://coma39658-ctrl.github.io/null-bench/ezero_trusted_friends_staging_20261106.html"

    fun isAllowedOrigin(raw: String): Boolean = try {
        val uri = URI(raw)
        uri.scheme == "https" &&
            uri.host == "coma39658-ctrl.github.io" &&
            uri.port == -1 &&
            uri.rawUserInfo == null &&
            uri.rawQuery == null &&
            uri.rawFragment == null &&
            (uri.rawPath.isNullOrEmpty() || uri.rawPath == "/")
    } catch (_: Exception) {
        false
    }

    fun isAllowed(raw: String): Boolean = try {
        val uri = URI(raw)
        uri.scheme == "https" &&
            uri.host == "coma39658-ctrl.github.io" &&
            uri.port == -1 &&
            uri.rawUserInfo == null &&
            uri.rawQuery == null &&
            uri.rawFragment == null &&
            uri.rawPath == "/null-bench/ezero_trusted_friends_staging_20261106.html"
    } catch (_: Exception) {
        false
    }
}
