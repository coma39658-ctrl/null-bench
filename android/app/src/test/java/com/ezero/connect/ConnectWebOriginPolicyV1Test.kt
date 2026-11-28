package com.ezero.connect

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ConnectWebOriginPolicyV1Test {
    @Test fun allowsOnlyTheExactHttpsEntryPage() {
        assertTrue(ConnectWebOriginPolicyV1.isAllowed(ConnectWebOriginPolicyV1.ENTRY_URL))
    }

    @Test fun rejectsHttpAndLookalikeHosts() {
        assertFalse(ConnectWebOriginPolicyV1.isAllowed(
            ConnectWebOriginPolicyV1.ENTRY_URL.replace("https://", "http://")
        ))
        assertFalse(ConnectWebOriginPolicyV1.isAllowed(
            "https://coma39658-ctrl.github.io.evil.example/null-bench/ezero_trusted_friends_staging_20261106.html"
        ))
    }

    @Test fun rejectsOtherPathsPortsQueriesFragmentsAndUserInfo() {
        val base = ConnectWebOriginPolicyV1.ENTRY_URL
        assertFalse(ConnectWebOriginPolicyV1.isAllowed(base + "?next=evil"))
        assertFalse(ConnectWebOriginPolicyV1.isAllowed(base + "#fragment"))
        assertFalse(ConnectWebOriginPolicyV1.isAllowed(base.replace("ezero_trusted_friends_staging_20261106.html", "index.html")))
        assertFalse(ConnectWebOriginPolicyV1.isAllowed(base.replace("https://", "https://attacker@")))
        assertFalse(ConnectWebOriginPolicyV1.isAllowed(base.replace("github.io/", "github.io:443/")))
    }

    @Test fun rejectsMalformedAndRelativeUrls() {
        assertFalse(ConnectWebOriginPolicyV1.isAllowed("not a url"))
        assertFalse(ConnectWebOriginPolicyV1.isAllowed("/null-bench/ezero_trusted_friends_staging_20261106.html"))
    }
}
