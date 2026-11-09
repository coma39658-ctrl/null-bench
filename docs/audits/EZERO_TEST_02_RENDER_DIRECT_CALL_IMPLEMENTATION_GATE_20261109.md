# TEST 02 — Render direct-call implementation gate (2026-11-09)

## Verified source-level blocker
The Render static builder explicitly replaces trusted inbox config `enabled:true` with `enabled:false`, and its final assertion requires the disabled state. The browser client additionally binds both its signed WebSocket challenge and invite URL to `https://coma39658-ctrl.github.io`. The Render TEST hostname is a different origin. Consequently, toggling one boolean alone cannot enable safe direct calling.

## Minimal isolated implementation sequence
1. **Server (staging only):** provision or verify an owned dedicated authenticated WSS inbox endpoint with an exact Render TEST Origin allowlist, replay-resistant nonce and expiry, bounded rate/size, identity-signature verification, contact consent, no chat/media storage, and clear failure codes. Do not reuse the production origin's trust challenge.
2. **Client (staging only):** derive signed challenge origin and exact invitation page from an explicit immutable per-deployment configuration, validate against the expected HTTPS host and path, reject all other origins, and keep QR WebRTC untouched. Never use wildcard origins, dynamic untrusted query parameters or silently bypass signed authentication.
3. **Build:** enable the inbox only when a dedicated staging WSS endpoint and its configuration have been independently verified. Preserve fail-closed default; add strict CSP `connect-src` for the exact endpoint only.
4. **Automated tests:** reject mismatched origin, forged signature, expired/replayed challenge, unknown/blocked friend, wrong media kind, unverified receipt, absent recipient, declined call, and media start before acceptance. Preserve QR audio/video and camera/mic permissions.
5. **Real two-phone test:** both phones on same verified TEST SHA, friend saved on both, incoming service opted-in in foreground, audio and video calls initiated without QR, card visible on recipient, explicit accept/decline, two-way media, hangup and privacy behavior. Record PASS/FAIL/UNKNOWN per step.

## Current evidence
- Source inspection: PASS (builder disables inbox and client requires GitHub Pages origin).
- Screenshot: saved friend visible; direct-call unavailable (FAIL owner-observed).
- Dedicated Render-origin authenticated inbox: UNKNOWN.
- CI execution and asset SHA verification for this new branch: UNKNOWN.
- Real no-QR audio/video call: FAIL on old Render TEST; new build NOT DEPLOYED.

**Release gate:** NO RELEASE until all relevant CI PASS, exact asset SHA matches, consent/privacy/CSP checks PASS and real two-phone direct-call PASS. Existing public Render and GitHub Pages remain unchanged.
