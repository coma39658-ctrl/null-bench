# E-ZERO Connect — Ten-Stage Delivery Plan

Owner decision: the new clean-build application is the only product direction. The previous application is archived and is not a runtime dependency.

| Stage | Deliverable | Exit evidence |
|---|---|---|
| 1. Product shell | Approved simple mobile UI, Urdu/English/Arabic, responsive layout | Mobile Chromium UI regression |
| 2. Device identity | Consent-gated, non-extractable device signing key and public fingerprint | Browser tests for no-consent, persistence, key policy and sign/verify |
| 3. QR first-contact | Signed, one-time, expiring invite; scan by camera and gallery | Signature, expiry, replay, malformed-payload and two-device tests |
| 4. Mutual trust | Both parties approve and sign same relationship transcript; revoke/block | Two-party approval, refusal, revoke and key-mismatch tests |
| 5. Signaling | New authenticated Worker + Durable Object room service | Real staging WSS tests, origin/role/rate/expiry checks |
| 6. Calls | New call controller with immutable audio/video mode and explicit accept | Two-browser contracts, then two real Android devices; TURN test |
| 7. Saved friends | Local trusted-contact list, search and no-QR reconnect after trust | Reconnect, retention, revocation and no-media-before-click tests |
| 8. Messaging | Text first, then image and voice-note transfers with honest delivery states | Payload limits, disconnect, retry/error and two-device tests |
| 9. Notifications and PWA | Install flow and platform-supported push only | Android/iOS platform-specific delivery tests; no powered-off guarantee |
| 10. Release | Security/privacy/accessibility review, rollback and public entry point | All prior gates green, physical-device evidence and explicit production release approval |

## Current state

- Stage 1: implementation and isolated mobile browser tests passed on the clean-build branch.
- Stage 2: **PASS in isolated mobile Chromium CI.** A local ECDSA P-256 device key is generated only after explicit checkbox + button consent; private key is non-extractable and persisted in IndexedDB. Tests verified no key exists before consent, the key can sign and its public key verifies, the private key is non-extractable, and the same fingerprint survives reload. This is browser-test evidence, not physical Android-device proof.
- Stages 3–10: planned; not yet implemented or verified.

## Release discipline

Each stage stays on isolated preview branches. A failed gate is fixed before the next dependent stage is marked complete. Production remains untouched until Stage 10 and the owner explicitly approves the production release.
