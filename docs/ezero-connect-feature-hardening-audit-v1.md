# E-ZERO Connect — Feature-by-feature hardening and simplification audit v1

Status: staging design and acceptance plan. This document does not certify implementation or physical-device behavior.

## Product consent model (required change)
- Inviter consent: the user deliberately creates/shares a short-lived signed QR or invite link.
- Invitee consent: the user deliberately scans/imports/opens that invite.
- After both devices complete the signed, origin-bound, proof-of-possession handshake, each device idempotently saves the verified peer locally. No extra bilateral Accept screen and no separate Save confirmation.
- The invitee can decline before scanning/opening. After pairing, either side can Remove or Block. Remove requires a fresh invite to reconnect; Block additionally suppresses future requests/calls until explicit Unblock.
- A call is never auto-answered. The receiver explicitly accepts or declines every call.
- Display name and avatar are untrusted metadata, never identity proof. Show a verified-device indicator/fingerprint separately.

## Feature audit matrix

### 1. First launch, identity and profile
- Explain in plain Urdu/English/Arabic what the device key does, what is stored locally, and what is not uploaded.
- Generate one P-256 device identity once; private key remains non-extractable. Do not silently create a replacement identity when a key is missing.
- Add explicit recovery state for lost/corrupt browser storage: explain that saved contacts cannot be silently restored from a name/avatar; re-pair with a fresh invite.
- Bound and sanitize display name; avatar upload must enforce MIME sniffing, byte/dimension/pixel limits, strip EXIF, reject SVG/HTML, and render as an image resource rather than markup.
- Provide a clear local-data export/delete explanation without promising remote deletion of data that was never stored remotely.

### 2. QR and invite link
- One signed invite per room, cryptographically random room ID and nonce, exact origin, 90-second maximum TTL, single use.
- Show a visible 90-second countdown and localized expiry; regenerate only after expiry or explicit refresh.
- Do not reveal QR until the host signaling socket is authenticated and ready. Clear QR immediately on disconnect, expiry, failed handshake or page teardown.
- Scanner must be full-screen and responsive; camera permission denial gets a clear recovery action. Camera switch, torch only when supported, and gallery-image QR import must all work.
- Validate exact origin, signature, key fingerprint, room, nonce, expiry and replay server-side. Do not trust client clock for server-issued challenge expiry; server remains authoritative.
- Bound QR parsing size and reject malformed, oversized, wrong-origin and replayed payloads with distinct safe error codes.
- Prevent simultaneous double scans, multi-tab races and cross-device replay. Server-side one-time consumption is authoritative; browser storage is defense in depth.
- Sharing QR/link is an intentional inviter action. Opening/scanning is an intentional invitee action; do not insert redundant approval prompts after a valid handshake.

### 3. Pairing and trusted contacts
- Replace the current two signed relationship approvals plus separate local Save prompt with the consent model above, without weakening signed invite validation or signed device handshake.
- Derive a deterministic relationship ID from the verified invite/handshake transcript; both sides must independently derive the same ID.
- Persist locally only after complete cryptographic verification; make save idempotent for duplicate events and safe under concurrent tabs.
- If one device is temporarily offline during final persistence, use a bounded, signed, replay-safe completion event; never show "saved on both" unless both sides actually confirm. Each local side may truthfully show its own saved state.
- Contact list must survive reload and app updates; deduplicate by fingerprint/relationship ID, not display name.
- Show own DP and verified friend's DP/name on the contact card. Clearly label profile details as user-provided.
- Remove: revoke local relationship and disable direct reconnect; require a fresh QR for re-add.
- Block: local suppression plus a server/signaling enforcement path for incoming trust/call attempts; unblock is explicit and does not restore trust automatically.
- Key mismatch, missing key, corrupt vault or unavailable secure storage fails closed with a useful recovery message.

### 4. Signaling Worker and server boundary
- Enforce exact allowlisted origins and WSS; staging and production origins/namespaces remain isolated.
- Authenticate every socket with a fresh one-time challenge and ECDSA proof of possession; bind room, role, nonce, origin, fingerprint and public key.
- Test duplicate host/guest sockets, role confusion, reconnect identity changes, stale sockets, malformed JSON, oversized payloads, unknown message types, flood/rate-limit behavior and room enumeration.
- Enforce server-authoritative invite/challenge/room expiry and one-time nonce consumption. Test clock skew in both directions and expiry boundaries.
- Add server-side blocked-fingerprint checks where a server-mediated request can be rejected; do not treat local UI hiding as sufficient enforcement.
- Ensure room/DO cleanup on expiry, failed handshake, decline, hangup, revocation, duplicate connection and network loss.
- Persist only minimum room routing state with strict TTL. Never persist QR secrets, private keys, SDP/ICE, message bodies, voice, images or profile photos.
- Redact invite codes, nonces, signatures, fingerprints, names, SDP/ICE and message payloads from logs. Add tests that inspect logs/storage for leaks.
- Apply bounded message size, rate limits, per-room connection caps and short bounded retries. No infinite reconnect/poll loops.

### 5. Audio/video calls
- Preserve the already-working legacy audio/video engine unchanged unless a focused regression requires a change.
- Contact-list call action uses saved verified fingerprint; no repeat QR for a trusted contact.
- Incoming call screen includes caller identity only after verifying the signed call invite against saved fingerprint; push payload alone is not trusted identity.
- Receiver must explicitly Accept/Decline; never auto-answer. Caller sees ringing, declined, timed out, busy or connected only when evidenced.
- Test microphone/camera permission denial, device rotation, front/back camera switch, audio/video mode preservation, speaker route, mute, camera off, hangup and repeated calls.
- Hangup/decline/timeout must close both peers, stop all media tracks and clear timers/state.
- Test ICE failure, network change, Wi-Fi/mobile handover, app foreground/background, duplicate call invite, stale invitation and recovery without creating ghost calls.
- No fabricated online status or call delivery state.

### 6. Android background incoming ringing
- Separate browser foreground behavior from native Android push/ringing capability.
- Implement FCM token registration only for E-ZERO, token refresh/revocation and per-device notification permission state.
- Push payload is a wake-up hint only; fetch/verify the signed call invite before showing trusted caller identity or enabling Accept.
- Verify Android notification channel, ringtone, vibration, lock-screen visibility, full-screen intent policy, foreground-service restrictions and Android 13+ notification permission.
- Handle app force-stop, process death, battery optimization, Doze, locked screen, reboot, token rotation, offline and duplicate push.
- Do not claim "rings while app is closed/screen off" until tested on at least two physical Android devices under those states. If unsupported, clearly disclose limitation.

### 7. Text, voice notes and images
- End-to-end encrypt content between verified devices; signaling relay must not receive plaintext content.
- Add explicit message size, MIME, duration, image pixel/decompression and attachment count limits.
- Sniff file type instead of trusting extension; strip image metadata; reject active content and malformed media.
- Show sending/sent/delivered/read only when each state has a verifiable receipt; never invent delivery.
- Bound offline queue, retries and retention. Support cancel and failed-send retry without duplicates.
- Voice note controls: record, stop, preview, send, cancel; clear microphone permission explanation and duration cap.
- Image send/receive must show safe preview and explicit download/save behavior.
- Deletion semantics must say whether deletion is local-only or a signed delete request; do not promise recipient deletion without acknowledgement.

### 8. Trusted list, search and history
- Search by display name locally; identity actions always resolve by fingerprint/relationship ID.
- Show own profile and peer DP/name, verified status, last successful interaction only if actually recorded.
- Call history separates incoming, outgoing, missed, declined and failed; timestamps use device locale and avoid false "missed" claims.
- Block and Remove are visible, distinct, confirm destructive action, and have explicit Unblock.
- Keep list updates atomic; adding/removing one friend must not erase others.

### 9. Privacy and data governance
- Publish a plain-language data inventory: local IndexedDB, Android app storage, FCM token, Worker ephemeral room state, operational logs and retention.
- State clearly: no ads, no sale of data, no server-side call/message recording; disclose unavoidable push metadata and service-provider processing.
- No analytics or crash reports containing identity, QR, contacts, message content or media.
- Give local clear-data and account/device identity reset controls with consequences explained.
- Use short TTLs and scheduled cleanup; test actual expiry and deletion, not just UI labels.
- Provide privacy notice in Urdu, English and Arabic.

### 10. Accessibility, localization and reliability
- Keep one canonical staging URL and one simple home screen.
- Localize every success, loading, permission, retry, expiry and failure state in Urdu/English/Arabic.
- Use large touch targets, visible focus, screen-reader labels, adequate contrast and no color-only status.
- Every visible button must work; no dead controls or duplicate buttons.
- Show concise progress states: preparing, waiting for scan, verifying, saving locally, ready, expired, failed.
- Retry at most once automatically where safe, then offer a clear manual action; no loops.
- Test slow network, offline startup, page reload mid-pairing, browser storage disabled/full, low memory and app update.

### 11. Release gates and evidence
- Gate A: unit/contract tests for crypto, invite, replay, storage, Worker limits, privacy and cleanup.
- Gate B: automated two-profile browser tests, including all negative/adversarial cases.
- Gate C: staging deploy health, exact origin, Worker connectivity, QR generation/scan and contact persistence.
- Gate D: two physical Android devices for QR, saved-friend reconnect, audio, video, messages, gallery/camera, and real push ringing with screen off/app closed.
- Gate E: review logs/storage for secret leakage; confirm no production resource or unrelated Firebase project changed.
- CI success is not physical-device proof. Public release only after all required gates are recorded PASS; partial/unknown results remain explicit.

## Immediate priority order
1. Keep PR #193 clock-skew fix isolated to staging and verify its deployment.
2. Replace redundant trust approvals with the explicit share + scan consent model; write new negative/positive tests before removing old protocol.
3. Add server-enforced block/revoke and idempotent contact persistence.
4. Fix the current QR/challenge flow on the canonical staging URL.
5. Test saved-friend direct reconnect without QR while preserving audio/video.
6. Complete message/media security and privacy limits.
7. Implement and physically validate native Android push ringing.
8. Run the full release gates; only then issue one canonical test link.

## Evidence boundary
This is a design/acceptance audit based on the current repository sources and user requirements. It is not proof that every item is implemented, deployed or physically tested.