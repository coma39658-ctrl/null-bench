package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BrowserCallHandoffTest {
    private val callId = "A".repeat(32)

    @Test fun acceptedAudioCallAddsOnlyOpaqueWakeLocator() {
        assertEquals(
            "https://ezero-connect-call-controller-preview.onrender.com/ezero-connect-app.html?ezero_wake_call=$callId&ezero_wake_mode=AUDIO",
            BrowserCallHandoff.buildUrl(
                "https://ezero-connect-call-controller-preview.onrender.com/ezero-connect-app.html",
                callId,
                "audio"
            )
        )
    }

    @Test fun existingQueryAndFragmentArePreserved() {
        assertEquals(
            "https://coma39658-ctrl.github.io/null-bench/ezero-connect-app.html?lang=ur&ezero_wake_call=$callId&ezero_wake_mode=VIDEO#top",
            BrowserCallHandoff.buildUrl(
                "https://coma39658-ctrl.github.io/null-bench/ezero-connect-app.html?lang=ur#top",
                callId,
                "VIDEO"
            )
        )
    }

    @Test fun rejectsUnknownOriginAndMalformedCallId() {
        assertNull(BrowserCallHandoff.buildUrl("https://evil.example/app.html", callId, "AUDIO"))
        assertNull(BrowserCallHandoff.buildUrl("http://coma39658-ctrl.github.io/app.html", callId, "AUDIO"))
        assertNull(BrowserCallHandoff.buildUrl("https://coma39658-ctrl.github.io/app.html", "bad", "AUDIO"))
        assertNull(BrowserCallHandoff.buildUrl("https://coma39658-ctrl.github.io/app.html", callId, "TEXT"))
    }
}
