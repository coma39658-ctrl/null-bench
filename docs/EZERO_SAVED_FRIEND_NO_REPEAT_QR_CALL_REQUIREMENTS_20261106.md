# E-ZERO Secure Connect: Save once, call again without scanning QR

Status: **Phase A local opt-in identity + saved-friend UI implemented on development branch; no-QR remote redial NOT implemented or deployed** (2026-11-06).

Phase A branch changes:
- Opt-in IndexedDB-stored **non-extractable** P-256 device signing CryptoKey, validated against its exported public key and fingerprint on reload. Ephemeral signed QR expiry remains 10 minutes.
- Saved Friend only after an observed connected WebRTC channel and an explicit button click. A verified call fingerprint and chosen nickname are stored locally; remove friend is available. The human behind a self-declared nickname/photo has not been independently verified.
- Runtime Node regression + isolated GitHub Action gate added; requires actual CI run and two-phone verification before any release.
- The saved-friend card is **not yet a callable identity**. Addressable authenticated signaling, mutual registration, replay prevention, incoming-call routing, TURN evaluation, and browser storage recovery still remain.

Scope: the existing one-green-page WebRTC calling experience on two Android/mobile browsers.

## Confirmed user acceptance goal

1. A user initially pairs with a trusted friend (QR or verified invitation), completes a *real* signed WebRTC connection, and explicitly chooses **Save Friend**.
2. The peer appears in **Friends** with the user's chosen nickname. A self-declared display name and avatar are not proof of a real-world identity.
3. On subsequent visits (including after ending a call, closing the browser and reopening the app), the user taps that saved contact's **Audio** or **Video** button, **without rescanning or resharing QR**.
4. The recipient sees an incoming call invitation addressed to that saved, authenticated relationship and accepts or declines. No microphone/camera permissions are activated before consent.
5. The initiator receives the signed WebRTC answer automatically; the UI reports **Connected** only when authenticated WebRTC and actual media/channel observations support the claim.
6. Both parties can hang up, cancel and remove the saved friend. Ended sessions must not block subsequent fresh calls.

## Current limitations, confirmed from repository code

- `js/ezero_secure_connect_live_p2p_v0_1.js` `loadIdentity()` generates a **fresh ECDSA P-256 key** each page load; the identity QR expires after 10 minutes. A saved fingerprint is *not* a persistent address.
- `js/ezero_secure_connect_contacts_v0_1.js` stores a local nickname + SHA-256 fingerprint after signed QR verification and explicitly requires verifying again; it has no remote call delivery.
- `js/ezero_secure_connect_people_v0_1.js` displays local saved fingerprints and completed-call history; it does not supply an authenticated call route. Call history expires after 10 minutes and is separate from a saved contact.
- `js/ezero_secure_connect_auto_signaling_pilot_v0_1.js` uses a temporary room/token with a single invite link and Cloudflare WebSocket signaling. It cannot send to a known person's stable inbox. `closeRoom()` resets its session; a new invitation still has to reach the other phone.
- The pilot is experimental. No reliable background notification, cross-device account sync, universal STUN/TURN access or repeat-call success has been verified.

## Minimum secure engineering work

### 1. Stable device identity

Use an opt-in user-created ECDSA P-256 identity whose **non-exportable private CryptoKey** is stored in origin-scoped IndexedDB; derive a stable public-key fingerprint, and rotate separately the ephemeral WebRTC session offers and tokens. Do not store a long-lived private key or authentication bearer token in a QR link or localStorage. Define device-loss/recovery, unlink and identity reset clearly. Browser storage deletion loses identity unless a separately audited recovery flow exists.

### 2. Reciprocal trust registration

Once a real, signed WebRTC session is connected, offer **Save Friend** with explicit confirmation. Store locally the signed, stable peer public-key identity and nickname. Require explicit approval for sharing/revealing a routable identifier. Maintain revocation and blocking. Do not quietly trust self-declared profile names/photos.

### 3. Addressable authenticated signaling

Build and separately test an authenticated, rate-limited mailbox/online-session routing layer at the controlled signaling service. A saved friend can send a request addressed to the recipient's stable public identity, authenticated with fresh challenge signatures and bounded expiry. Reject replay and unapproved contacts; use no global directory; avoid exposing full presence unless opted in. Sign and bind SDP, room and both peers' identities and new call nonce. Audit origin restrictions and logs; do not put session secrets into query parameters.

### 4. Reliable redial lifecycle

Maintain an explicit state machine: IDLE → DIALING → RINGING → ACCEPTED → CONNECTING → CONNECTED → ENDED/FAILED. Use fresh room ID / SDP / ICE for *every* call; dispose previous RTCPeerConnection, tracks, DataChannel and WebSocket on hangup/failure; clear all timers. Never treat a stale `session` as active. Add safe reconnect/retry state messages; no phantom success. No automatic microphone/camera capture or call acceptance.

### 5. Mobile realities

Active-browser foreground delivery is phase 1. Background incoming-call notifications need a separate Push API / service-worker permission and wake reliability evaluation on Android/iOS; do not promise WhatsApp-equivalent background ringing on static GitHub Pages. STUN and properly provisioned TURN fallback require distinct network testing. Keep global unrestricted production auto signaling OFF until tested.

## Acceptance criteria (must pass on physical phones)

- First-ever QR pairing + verified media + explicit Save Friend; only one QR pairing required if retained identity and consent are intact.
- Reload/close/reopen two browsers. Contact persists; tapping saved friend's Audio calls their *online foreground* app without QR or manually sharing a link. Recipient explicitly accepts; actual bidirectional voice works.
- Complete 5 consecutive call/hangup/redial cycles across both phones without refreshing or scanning another QR, and 2 extra cycles after reloading both pages. Never use stale invites or misleading green checks.
- Reject invalid identity signatures, replayed invites, blocked caller, expired invites and non-consenting camera/microphone activation.
- Exercise same Wi-Fi and mobile-data-to-Wi-Fi. When NAT prevents peer-to-peer and TURN is unavailable, show an honest network error.
- Test browser storage cleared/device changed: contact is not falsely restored; user receives a recovery/re-pair notice.
- Run browser integration, security and accessibility regression gates before merging to `main` or public deployment.

## Rollout

Keep the currently functioning QR/one-request call available while developing this **saved-contact, no-repeat-QR** flow on an isolated branch. Never label a nickname shortcut or repeated invite sharing as one-tap direct calling. No production changes or Cloudflare deployment are implied by this document.
