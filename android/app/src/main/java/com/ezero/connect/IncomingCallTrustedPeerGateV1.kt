package com.ezero.connect

/**
 * Final local authorization gate for an authenticated incoming invite.
 *
 * The server-authenticated invite must supply the caller fingerprint and
 * relationship ID only after its one-use fetch has been verified. FCM fields
 * alone are never an invite and must never be passed as trusted input here.
 */
internal object IncomingCallTrustedPeerGateV1 {
    fun resolve(
        savedContacts: List<AndroidTrustedContactBundleV1.TrustedContact>,
        callerFingerprint: String,
        relationshipId: String
    ): AndroidTrustedContactBundleV1.TrustedContact? {
        if (!callerFingerprint.matches(Regex("^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$"))) return null
        if (!relationshipId.matches(Regex("^[a-f0-9]{64}$"))) return null

        val matches = savedContacts.filter {
            it.remoteFingerprint == callerFingerprint &&
                it.relationshipId == relationshipId &&
                it.status == "TRUSTED"
        }
        return matches.singleOrNull()
    }
}
