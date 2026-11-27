package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class IncomingCallTrustedPeerGateV1Test {
    private val fingerprint = (1..32).joinToString(":") { "%02X".format(it) }
    private val relationship = "a".repeat(64)
    private val trusted = AndroidTrustedContactBundleV1.TrustedContact(
        relationshipId = relationship,
        remoteFingerprint = fingerprint,
        remotePublicKeySpki = "public-spki",
        displayName = "Alice",
        trustVersion = 2,
        importedAt = 1_800_000_000_000L
    )

    @Test fun resolvesOnlyExactTrustedFingerprintAndRelationship() {
        assertEquals(
            trusted,
            IncomingCallTrustedPeerGateV1.resolve(listOf(trusted), fingerprint, relationship)
        )
    }

    @Test fun rejectsCallerWithCorrectFingerprintButDifferentRelationship() {
        assertNull(
            IncomingCallTrustedPeerGateV1.resolve(listOf(trusted), fingerprint, "b".repeat(64))
        )
    }

    @Test fun rejectsUntrustedBlockedAndRevokedRecords() {
        for (status in listOf("PENDING", "BLOCKED", "REVOKED")) {
            assertNull(
                IncomingCallTrustedPeerGateV1.resolve(
                    listOf(trusted.copy(status = status)), fingerprint, relationship
                )
            )
        }
    }

    @Test fun rejectsMalformedFingerprintAndRelationship() {
        assertNull(IncomingCallTrustedPeerGateV1.resolve(listOf(trusted), "Alice", relationship))
        assertNull(IncomingCallTrustedPeerGateV1.resolve(listOf(trusted), fingerprint, "short"))
    }

    @Test fun rejectsAmbiguousDuplicateRecords() {
        assertNull(
            IncomingCallTrustedPeerGateV1.resolve(
                listOf(trusted, trusted.copy(displayName = "Duplicate")),
                fingerprint,
                relationship
            )
        )
    }

    @Test fun neverFallsBackToDisplayName() {
        assertNull(
            IncomingCallTrustedPeerGateV1.resolve(
                listOf(trusted.copy(remoteFingerprint = fingerprint.dropLast(2) + "FF")),
                fingerprint,
                relationship
            )
        )
    }
}
