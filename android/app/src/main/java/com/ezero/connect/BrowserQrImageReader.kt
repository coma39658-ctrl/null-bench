package com.ezero.connect

import android.graphics.Bitmap
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.MultiFormatReader
import com.google.zxing.NotFoundException
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer

/** Decodes QR content locally; cryptographic identity verification is a separate step. */
internal object BrowserQrImageReader {
    fun read(bitmap: Bitmap): String {
        require(bitmap.width > 0 && bitmap.height > 0) { "BAD_IMAGE" }
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        val source = RGBLuminanceSource(bitmap.width, bitmap.height, pixels)
        val hints = mapOf(DecodeHintType.POSSIBLE_FORMATS to listOf(com.google.zxing.BarcodeFormat.QR_CODE))
        return try {
            MultiFormatReader().apply { setHints(hints) }
                .decodeWithState(BinaryBitmap(HybridBinarizer(source))).text
        } catch (_: NotFoundException) {
            throw IllegalArgumentException("QR_NOT_FOUND")
        }
    }
}
