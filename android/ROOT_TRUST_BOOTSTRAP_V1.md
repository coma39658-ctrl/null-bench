# E-ZERO Root trust bootstrap — staging gate V1

Status: isolated design and validation code only. No Root key has been pinned, no account authority has been established, and no enrollment endpoint or Worker has been activated.

## Why this gate exists

The browser signer holds a non-exportable P-256 private key in IndexedDB and can expose its public SPKI/fingerprint. That proves possession of a key, not that the key is an authorized E-ZERO Root. A QR carrying its own public key cannot authenticate itself.

## Required first-use ceremony

1. On the already-authorized Root browser, load the existing E-ZERO identity and export only its public SPKI plus SHA-256 fingerprint. Never export or transmit the private key.
2. Display the complete lowercase SHA-256 fingerprint on the Root browser.
3. On the Android device, import the candidate public SPKI and independently calculate the fingerprint.
4. Compare the complete 64-hex fingerprint on a separate trusted channel (for example, read it aloud or compare it in person). Do not rely solely on scanning the QR that contains the key.
5. Only after the human confirms an exact match may Android call `AndroidRootTrustPinV1.pinAfterIndependentConfirmation`. The confirmation argument must be the independently checked fingerprint, not a value copied automatically from the QR.
6. Android stores the public SPKI and fingerprint in app-private preferences. Every later approval verification must load this pin and pass it to `AndroidRootApprovalVerifierV1.verify`.
7. If app data is cleared, the app is reinstalled, or the pin is missing/corrupt, fail closed and repeat the out-of-band ceremony. Never silently trust a replacement key.

## Current implementation boundary

- `validateCandidate` validates canonical base64url, SPKI size, P-256 curve, and recomputed SHA-256 fingerprint.
- `pinAfterIndependentConfirmation` requires an exact independent fingerprint confirmation before persistence.
- `load` revalidates the stored pin before use.
- The pin store is not yet connected to MainActivity, QR display/scanning, the pending challenge transport, or the Worker registry.
- No production or public service is changed by this staging work.

## Signature encoding interoperability

Web Crypto ECDSA signatures are 64-byte IEEE-P1363 `r || s` values for P-256. The Android verifier converts that value to DER only for the JCA `SHA256withECDSA` verifier. Cloudflare Web Crypto verifies the P1363 value directly. Canonical signed bytes are UTF-8 with fixed LF field order and a final LF. Do not describe the on-wire signature as DER.

## Release gates

Unit tests must pass. Then wire the verified pin into Android approval verification; add negative tests for wrong pin, changed SPKI, replayed/expired challenge, and signature tampering. Only after this should a separately reviewed staging API integration be attempted. Physical two-phone enrollment and call tests remain separate gates.
