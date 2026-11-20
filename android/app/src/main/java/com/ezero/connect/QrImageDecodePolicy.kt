package com.ezero.connect

/** Pure, testable bounds policy for decoding untrusted gallery images. */
internal object QrImageDecodePolicy {
    private const val MAX_DECODE_PIXELS = 8_000_000L
    private const val MAX_DIMENSION = 4096

    fun sampleSize(width: Int, height: Int): Int {
        require(width > 0 && height > 0) { "IMAGE_DIMENSIONS_INVALID" }
        var sample = 1
        while (width.toLong() / sample * (height.toLong() / sample) > MAX_DECODE_PIXELS ||
            maxOf(width, height) / sample > MAX_DIMENSION
        ) {
            require(sample <= (1 shl 29)) { "IMAGE_DIMENSIONS_UNSUPPORTED" }
            sample *= 2
        }
        return sample
    }
}
