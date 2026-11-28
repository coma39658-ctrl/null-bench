# E-ZERO Root Public Identity Display V1

Status: isolated staging implementation; not deployed to the canonical public origin.

## Purpose
The page `/ezero-root-public-identity-staging.html` reads the existing browser Root identity through `js/ezero_connect_identity_v1.js` and displays only:
- the existing P-256 public SPKI as unpadded Base64URL;
- the SHA-256 fingerprint as 64 lowercase hexadecimal characters.

## Security boundaries
- It calls only `load()` and `getPublicIdentity()`.
- It does not call `createAfterConsent()`, signing methods, enrollment endpoints, or network upload.
- It does not create a replacement Root identity when no existing record is found.
- It never exports or displays the private CryptoKey.
- The fingerprint must be independently compared out-of-band before Android pinning.
- A page served from another origin cannot read the original origin's browser identity storage.
- Do not publish this page to the canonical origin until its source contract test and the full CI workflow pass.

## Validation
`tests/test_ezero_root_public_identity_page_v1.mjs` checks the source contract and is included in the isolated evidence-validator workflow. A source test is not a browser execution test. A live same-origin browser test and an independent fingerprint comparison remain required.

## Explicit non-claims
This page does not enroll a phone, approve a device, register a Root with a server, enable saved-friend trust, or enable incoming call delivery.
