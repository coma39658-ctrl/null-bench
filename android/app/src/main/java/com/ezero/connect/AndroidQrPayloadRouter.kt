package com.ezero.connect

/** Separates enrollment transport envelopes from permanent friend identity QR tokens. */
internal object AndroidQrPayloadRouter {
    enum class Kind { ENROLLMENT_REQUEST, ENROLLMENT_APPROVAL, INVALID_ENROLLMENT, PERMANENT_QR_CANDIDATE }

    fun classify(raw: String): Kind = when {
        raw.startsWith("EZERO_ANDROID_ENROLL_REQUEST_V1") -> Kind.ENROLLMENT_REQUEST
        raw.startsWith("EZERO_ANDROID_ENROLL_APPROVAL_V1") -> Kind.ENROLLMENT_APPROVAL
        raw.startsWith("EZERO_ANDROID_ENROLL_") -> Kind.INVALID_ENROLLMENT
        else -> Kind.PERMANENT_QR_CANDIDATE
    }
}
