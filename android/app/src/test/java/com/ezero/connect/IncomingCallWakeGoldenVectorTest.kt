package com.ezero.connect

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Test

class IncomingCallWakeGoldenVectorTest {
    @Test fun canonicalBytesMatchSharedGoldenVectorExactly() {
        val input = javaClass.classLoader!!.getResourceAsStream("incoming_call_wake_v1.properties")!!
            .bufferedReader().use { it.readLines().associate {
                val index = it.indexOf('=')
                it.substring(0, index) to it.substring(index + 1)
            } }
        val actual = IncomingCallWakeSignatureVerifier.canonicalMessage(
            input.getValue("wake_v"),
            input.getValue("call_id"),
            input.getValue("mode"),
            input.getValue("expires_at"),
            input.getValue("nonce")
        ).toString(Charsets.UTF_8)
        assertEquals(input.getValue("canonical").replace("\\n", "\n"), actual)
    }
}
