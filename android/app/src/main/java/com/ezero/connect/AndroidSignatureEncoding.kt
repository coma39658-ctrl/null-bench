package com.ezero.connect

/** Converts JCA ASN.1 DER ECDSA signatures to WebCrypto's 64-byte P-256 IEEE-P1363 form. */
internal object AndroidSignatureEncoding {
    fun derP256ToP1363(der: ByteArray): ByteArray {
        require(der.size in 8..72) { "DER_SIGNATURE_SIZE" }
        var offset = 0
        fun read(): Int {
            require(offset < der.size) { "DER_TRUNCATED" }
            return der[offset++].toInt() and 0xff
        }
        require(read() == 0x30) { "DER_SEQUENCE" }
        require(read() == der.size - 2) { "DER_SEQUENCE_LENGTH" }
        fun integer(): ByteArray {
            require(read() == 0x02) { "DER_INTEGER" }
            val length = read()
            require(length in 1..33 && offset + length <= der.size) { "DER_INTEGER_LENGTH" }
            var value = der.copyOfRange(offset, offset + length)
            offset += length
            require(value[0].toInt() and 0x80 == 0) { "DER_NEGATIVE_INTEGER" }
            if (value.size > 1 && value[0] == 0.toByte()) {
                require(value[1].toInt() and 0x80 != 0) { "DER_REDUNDANT_ZERO" }
                value = value.copyOfRange(1, value.size)
            }
            require(value.size <= 32) { "DER_INTEGER_OVERFLOW" }
            return ByteArray(32).also { System.arraycopy(value, 0, it, 32 - value.size, value.size) }
        }
        val r = integer()
        val s = integer()
        require(offset == der.size) { "DER_TRAILING_DATA" }
        return r + s
    }
}
