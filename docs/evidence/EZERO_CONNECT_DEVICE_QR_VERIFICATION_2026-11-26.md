# E-ZERO Connect — Device QR Verification Checkpoint

Date: 2026-11-26
Environment: isolated Render staging preview
Evidence source: owner-provided screenshot and direct report from a physical Android phone

## Observed successful steps

- [x] Friend QR scanned.
- [x] QR signature / identity verification reported successful by the app.
- [ ] Both phones connected.
- [ ] Mutual approval completed on both phones.
- [ ] Friend saved in the trusted contacts list.
- [ ] Saved-friend direct call completed without scanning QR again.

The screenshot showed the first two progress indicators as complete and the remaining three as pending. This is a user-observed device checkpoint, not an automated test result or independent verification.

## Preservation requirements

- Preserve the existing locally stored, non-exportable device identity. Do not clear browser/site storage, reset the app, regenerate the device key, or ask the owner to repeat identity creation as part of routine testing.
- Preserve the verified QR scan/signature path. Future changes must be additive and must not weaken signature, origin, nonce, fingerprint, expiry, or mutual-approval checks.
- Do not mark a friend as trusted until both parties have explicitly approved and the trusted-friend save operation succeeds.
- Continue from the current pending stage: establish both-phone connection, complete mutual approval, verify the friend appears on both devices, then verify saved-friend reconnect without another QR scan.
- If a future build appears to have lost the identity or saved state, stop and diagnose storage/origin/build continuity first. Do not immediately regenerate keys or repeat pairing.

## Release boundary

This checkpoint does not establish successful friend saving, audio/video calling, offline delivery, or background/locked-screen ringing. The current page remains an isolated staging preview and must not be described as a production public calling service.
