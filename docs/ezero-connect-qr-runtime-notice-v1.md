# E-ZERO Connect QR runtime notice

The clean-build QR renderer/decoder uses the exact pinned npm package `qr@0.7.2` (paulmillr-qr), bundled at build time into a same-origin local JavaScript asset. The browser does not load QR code logic from a third-party CDN, and the invite payload itself is never sent to the package publisher.

- Upstream: https://github.com/paulmillr/qr
- Package: https://www.npmjs.com/package/qr
- Version: 0.7.2 (pinned)
- Runtime dependencies: zero
- License: dual-licensed MIT OR Apache-2.0; upstream package includes both license texts.
- The 0.7.2 GitHub release is signed by the verified maintainer account.

The QR library only encodes/decodes pixels and text. It does not establish trust. E-ZERO independently validates the invite signature, exact origin, fingerprint, expiry and replay nonce.

## Reliability limitations

The upstream README reports approximately 58% decoding accuracy on its BoofCV photo-vector benchmark in default mode and approximately 61% with exhaustive retries. This benchmark is not a real-phone success rate. Therefore:
- do not rely on one decode attempt as proof of a valid invite;
- validate the decoded payload cryptographically;
- run camera and gallery tests on actual Android devices and different screen brightness/QR sizes;
- compare against native BarcodeDetector and independent QR readers where supported;
- never silently accept a malformed or unverifiable QR.

The package is bundled locally and version-pinned. No runtime CDN or third-party QR API is used.
