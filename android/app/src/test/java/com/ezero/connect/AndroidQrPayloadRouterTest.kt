package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Test

class AndroidQrPayloadRouterTest {
    @Test fun separatesRequestAndApprovalEnvelopes() {
        assertEquals(AndroidQrPayloadRouter.Kind.ENROLLMENT_REQUEST,
            AndroidQrPayloadRouter.classify("EZERO_ANDROID_ENROLL_REQUEST_V1\n"))
        assertEquals(AndroidQrPayloadRouter.Kind.ENROLLMENT_APPROVAL,
            AndroidQrPayloadRouter.classify("EZERO_ANDROID_ENROLL_APPROVAL_V1\n"))
    }

    @Test fun malformedEnrollmentPrefixNeverFallsThroughToFriendQrVerifier() {
        assertEquals(AndroidQrPayloadRouter.Kind.INVALID_ENROLLMENT,
            AndroidQrPayloadRouter.classify("EZERO_ANDROID_ENROLL_UNKNOWN_V9"))
        assertEquals(AndroidQrPayloadRouter.Kind.ENROLLMENT_REQUEST,
            AndroidQrPayloadRouter.classify("EZERO_ANDROID_ENROLL_REQUEST_V1"))
    }

    @Test fun unrelatedPayloadRemainsPermanentQrCandidate() {
        assertEquals(AndroidQrPayloadRouter.Kind.PERMANENT_QR_CANDIDATE,
            AndroidQrPayloadRouter.classify("EZERO2:sample-permanent-identity-token"))
    }
}
