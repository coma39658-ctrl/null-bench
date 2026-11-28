package com.ezero.connect

import java.util.Base64
import org.json.JSONObject
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class BrowserAndroidIdentityProofQrV1Test {
    private val now = 1_800_000_000_000L
    private val localFp = "a".repeat(64)
    private val localInstallId = "install_12345678"

    private fun payload(expiresAt: Long = now + 30_000L): String {
        val statement = JSONObject()
            .put("protocol", "EZERO_IDENTITY_INSTALLATION_BINDING_V1")
            .put("origin", "https://coma39658-ctrl.github.io")
            .put("challengeId", "challenge_123456789")
            .put("nonce", "n".repeat(32))
            .put("expiresAt", expiresAt.toString())
            .put("relationshipId", "b".repeat(64))
            .put("identityFingerprint", (0..31).joinToString(":") { "%02X".format(it) })
            .put("installationFingerprint", localFp)
            .put("installationId", localInstallId)
        return JSONObject()
            .put("type", "EZERO_BINDING_IDENTITY_PROOF_V1")
            .put("statement", statement)
            .put("signature", Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(64) { 1 }))
            .put("encoding", "P1363_BASE64URL")
            .toString()
    }

    @Test fun acceptsBoundUnexpiredProofShapeAndCanonicalBytes() {
        val proof = BrowserAndroidIdentityProofQrV1.decode(payload(), localFp, localInstallId, now)
        assertEquals("challenge_123456789", proof.challengeId)
        assertEquals(64, proof.signatureP1363.size)
        assertArrayEquals(
            listOf(
                "EZERO_IDENTITY_INSTALLATION_BINDING_V1",
                "https://coma39658-ctrl.github.io",
                "challenge_123456789", "n".repeat(32), (now + 30_000L).toString(),
                "b".repeat(64), (0..31).joinToString(":") { "%02X".format(it) },
                localFp, localInstallId
            ).joinToString("\n").toByteArray(Charsets.UTF_8),
            proof.canonicalBytes
        )
    }

    @Test fun rejectsExpiredAndOverlongChallenges() {
        assertThrows(IllegalArgumentException::class.java) {
            BrowserAndroidIdentityProofQrV1.decode(payload(now), localFp, localInstallId, now)
        }
        assertThrows(IllegalArgumentException::class.java) {
            BrowserAndroidIdentityProofQrV1.decode(payload(now + 60_001L), localFp, localInstallId, now)
        }
    }

    @Test fun rejectsDifferentInstallationAndUnknownFields() {
        assertThrows(IllegalArgumentException::class.java) {
            BrowserAndroidIdentityProofQrV1.decode(payload(), "c".repeat(64), localInstallId, now)
        }
        val altered = JSONObject(payload()).put("extra", "not-allowed").toString()
        assertThrows(IllegalArgumentException::class.java) {
            BrowserAndroidIdentityProofQrV1.decode(altered, localFp, localInstallId, now)
        }
    }

    @Test fun rejectsBadSignatureLengthAndWrongOrigin() {
        val shortSignature = JSONObject(payload()).put("signature", "AQ").toString()
        assertThrows(IllegalArgumentException::class.java) {
            BrowserAndroidIdentityProofQrV1.decode(shortSignature, localFp, localInstallId, now)
        }
        val wrongOrigin = JSONObject(payload()).getJSONObject("statement")
            .put("origin", "https://evil.example")
        val altered = JSONObject(payload()).put("statement", wrongOrigin).toString()
        assertThrows(IllegalArgumentException::class.java) {
            BrowserAndroidIdentityProofQrV1.decode(altered, localFp, localInstallId, now)
        }
    }

    @Test fun rejectsDuplicateTopLevelAndNestedJsonKeys() {
        val duplicateTopLevel = payload().replaceFirst(
            "\"type\":",
            "\"type\":\"unexpected\",\"type\":"
        )
        assertThrows(IllegalArgumentException::class.java) {
            BrowserAndroidIdentityProofQrV1.decode(duplicateTopLevel, localFp, localInstallId, now)
        }

        val duplicateNested = payload().replaceFirst(
            "\"protocol\":",
            "\"protocol\":\"unexpected\",\"protocol\":"
        )
        assertThrows(IllegalArgumentException::class.java) {
            BrowserAndroidIdentityProofQrV1.decode(duplicateNested, localFp, localInstallId, now)
        }

        // Escaped member names are decoded before duplicate comparison.
        val escapedAlias = payload().replaceFirst(
            """"type":""",
            """"type":"unexpected","\u0074ype":"""
        )
    }

    @Test fun rejectsOversizedQr() {
        assertThrows(IllegalArgumentException::class.java) {
            BrowserAndroidIdentityProofQrV1.decode("x".repeat(4097), localFp, localInstallId, now)
        }
    }
}
