# E-ZERO Connect — Scalable Friends and Profile Stage

Status: STAGING DESIGN BASELINE  
Base: `ezero-connect-qr-runtime-clean-integration-20261121`  
Branch: `ezero-connect-scalable-friends-profile-staging-20261121`

## Accepted product behavior

- Do not impose a fixed friend-count limit such as 500 or 20,400.
- Friend capacity is storage- and device-performance-bound, not a product quota. Never promise unlimited capacity.
- Preserve every trusted contact until the user explicitly removes, revokes, or blocks it. Adding a friend must never evict an older friend.
- Provide fast name/fingerprint search and a paged or virtualized list so a large contact book does not render thousands of DOM rows at once.
- Keep each contact's stable relationship ID and device fingerprint as the association key. A display name or picture is not an identity credential.
- Own profile: editable display name and optional avatar; local by default; sharing requires explicit opt-in.
- Friend profile: display name and optional avatar are shown only after a verified peer association and only when received through the authenticated encrypted peer channel. Clearly label it as peer-supplied, not real-world identity proof.
- Use initials when no avatar is available.
- Preserve the existing QR, mutual approval, encrypted-at-rest contact vault, and call/signaling baseline. Do not change production or the working call path in this stage.

## Scale architecture requirements

1. Keep IndexedDB as the durable local contact store; retain AES-GCM encryption at rest and a non-extractable device-held vault key.
2. Replace eager full-list rendering with bounded pages (initial target 40 visible contacts) and incremental loading/virtualization.
3. Add a normalized search path that does not expose plaintext contact names in an unencrypted index. Measure the decrypt/search cost on representative Android devices.
4. Use stable cursor/relationship identifiers for pagination; never use visible row position as identity.
5. Make contact writes additive and transactional. No automatic eviction or silent truncation.
6. Profile image payloads must be resized/compressed on-device, size-limited, and encrypted with the contact record before persistence. Do not upload profile images to the signaling service.
7. Backup/export and restore are a separate explicit user-consent workflow. Never silently sync private keys or profile data to a server.

## Required validation gates

- Existing trust, pairing, QR, saved-friend selection, and clean-build tests remain green.
- Add tests for 500+ generated contacts and larger synthetic datasets; verify no fixed quota, no automatic deletion, stable pagination, search correctness, and bounded DOM row count.
- Verify profile ownership association by fingerprint and relationship ID; reject profile payloads from unverified peers.
- Verify avatar compression, invalid/oversized image rejection, local encrypted persistence, and opt-in-only peer sharing.
- Verify storage quota/error handling: fail closed with a clear message and preserve previously saved contacts.
- Android browser performance and persistence tests are required before calling this stage production-ready.

## Release rule

This is a staging-only design baseline. No public release, production replacement, or claim of completed profile/list functionality until implementation and all required tests pass.

## Messaging requirements — text and voice

- Add a simple chat composer for each selected, verified friend: a text input, Send action, and a clearly separate press-to-record voice-message action.
- Text messages must be plain text only in the first implementation; enforce a bounded message size, render with textContent (never HTML), and show sender and local timestamp.
- Voice messages require an explicit user gesture to request microphone permission and start recording. Provide recording state, stop/cancel, playback preview, and explicit Send; never record in the background or auto-send.
- Use feature detection for MediaRecorder and supported audio MIME types. If recording is unsupported or permission is denied, show a clear explanation and keep text chat available.
- Bind every conversation to the selected trusted relationship ID and remote device fingerprint. Reject incoming message/voice payloads unless they arrive over the authenticated, encrypted peer session for that exact relationship.
- Encrypt message text and voice blobs before local persistence using a non-extractable device-held key. Keep message content and voice media off the signaling service; signaling may carry only the minimum session-routing metadata needed to establish the peer channel.
- Show honest message states: local-only/draft, sending, delivered only after an authenticated peer acknowledgement, and failed. Never label a message delivered merely because it was queued or submitted locally. If the peer is offline, explain that live delivery is unavailable; do not imply server-side store-and-forward exists unless implemented and separately secured.
- Voice media must be size/duration bounded, validated on receipt, and stored encrypted. Do not autoplay incoming audio. Playback and deletion are explicit user actions.
- Do not request microphone permission on page load. Do not alter the existing audio/video call engine or its permission flow; chat voice recording is a separate, user-initiated capability.
- Add multilingual Urdu/English/Arabic labels and accessible status announcements. Keep the composer compact and avoid adding unnecessary setup steps.

## Messaging validation gates

- Text: verify trusted-contact-only routing, correct conversation association, safe text rendering (including HTML-like input), message size limits, timestamps, and honest delivery/failure states.
- Voice: verify explicit permission flow, start/stop/cancel/preview/send, MIME fallback, permission-denied and unsupported-browser behavior, duration/size bounds, encrypted persistence, and no autoplay.
- Security: reject forged, replayed, malformed, oversized, unencrypted, or wrong-relationship incoming messages; verify acknowledgements are authenticated by the intended peer.
- Regression: all existing QR, trust, saved-friend, and audio/video calling tests must remain green. No production deploy until staging tests and real two-device checks pass.

## Integration audit — 2026-11-21

The clean QR/mobile shell was inspected before any wiring change.

- `ezero-connect-app.html` currently loads the clean identity, QR, trust, signaling-client, app, saved-friends, and pairing modules. It does not contain the DOM contract required by `ezero_secure_connect_peer_profile_staging_v0_1.js`; that profile module is not wired into this shell.
- The staged profile module currently persists its local profile in `localStorage`. This does not meet the encrypted-at-rest profile requirement above, so it must not be loaded as-is or described as complete.
- The clean shell's app controller explicitly keeps audio/video call buttons disabled until its verified services are implemented and release-gated. The clean-build QA workflow also states that its checks are not proof of live signaling, physical-phone operation, or calls.
- The older experimental WebRTC page contains a DataChannel and experimental one-view text/voice paths, but it is a separate manual-SDP lab, not the clean QR/mutual-approval app. Its transport does not establish the required trusted relationship binding for persistent chat. It must not be copied into the clean shell as if it were a production-ready transport.
- The signaling client's `session.send` is a relay API. It is not an end-to-end encrypted message channel; message bodies, profile photos, and voice media must not be sent through it.

### Safe implementation sequence

1. Add an encrypted local profile store to the clean shell (IndexedDB + AES-GCM + non-extractable device-held key), with own-name/avatar editing and initials fallback. Keep profile local until the user explicitly opts in.
2. Add selected trusted-friend profile display using only the existing encrypted contact record and stable relationship/fingerprint association. Do not accept profile fields from signaling relays.
3. Establish a separate authenticated WebRTC DataChannel adapter that checks the selected trusted relationship and both device fingerprints before any profile or chat payload is accepted.
4. Add text messages with bounded payloads, safe text rendering, encrypted local persistence, and authenticated delivery acknowledgements.
5. Add explicit-action voice recording, preview/cancel/send, bounded audio payloads, encrypted persistence, and authenticated acknowledgements.
6. Extend the clean-build QA workflow with focused tests for each new module. Preserve the existing QR/trust tests and frozen call-engine sources. Only then proceed to staging browser/two-device validation.

No app source, production service, or public deployment was changed by this audit. This entry records the verified integration boundary so the experimental modules are not accidentally mistaken for features already integrated into the clean app.
