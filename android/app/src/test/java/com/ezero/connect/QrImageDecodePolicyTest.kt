package com.ezero.connect

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class QrImageDecodePolicyTest {
    @Test fun keepsSmallImagesAtFullResolution() {
        assertEquals(1, QrImageDecodePolicy.sampleSize(1200, 900))
    }

    @Test fun downsamplesVeryLargeImagesWithinPixelAndDimensionBudgets() {
        val sample = QrImageDecodePolicy.sampleSize(12000, 9000)
        assertEquals(4, sample)
        assert(12000L / sample * (9000L / sample) <= 8_000_000L)
        assert(maxOf(12000, 9000) / sample <= 4096)
    }

    @Test fun rejectsInvalidDimensions() {
        assertThrows(IllegalArgumentException::class.java) { QrImageDecodePolicy.sampleSize(0, 100) }
        assertThrows(IllegalArgumentException::class.java) { QrImageDecodePolicy.sampleSize(100, -1) }
    }
}
