# E-ZERO Secure Connect — Ephemeral Messaging Protocol V0.1
2026-11-04 | Research candidate only | Not implemented, tested, audited or deployed.

## Product guarantees and necessary limits
- Messages and media are encrypted on sender device and only decrypted on approved recipient device.
- "Seen" means a client acknowledged revealing an item, not proof that a human read it; "heard" means device playback progressed, not proof a human listened.
- No default call recording, transcription, archive, or ad tracking; only transient encrypted pending messages and lawful operational metadata.
- Browser, OS, screenshots, second camera, malicious recipient or backups outside our control can defeat perfect "delete forever" promises. Never market impossible guarantees.
- Privacy-first keying: SHA-256 is a public-key fingerprint, not login authentication. Use passkeys, cryptographic signatures, one-time secure QR/code and mutual consent.

## States
CREATED -> ENCRYPTED_QUEUED -> FIRST_OPEN_CLAIMED -> CONSUMING -> CONSUMED -> PURGE_PENDING -> PURGED.
Alternative: ENCRYPTED_QUEUED/CONSUMING -> REVOKED or EXPIRED -> PURGE_PENDING -> PURGED.
Failure states: AUTH_FAILED, NOT_MEMBER, ALREADY_OPENED, BAD_KEY, REPLAY_DETECTED, EXPIRED, PURGE_FAILED, ACK_UNKNOWN.
Use atomic database compare-and-swap for first open, first authorized device wins. No silent retries that replay content. A worker verifies purge for object store, queue, media chunks and expiration backups. No PURGED unless evidence supports it.

## Rules by type
| Type | What user sees | Enforced deadline | Deletion |
| --- | --- | --- | --- |
| One-view text | One reveal with visible expiry | No replay; max reading grace 5 min as an upper bound | Destroy after close/expiry |
| One-listen voice | Encrypted while unread, explicitly tap to play | After playback starts, at most remaining duration + 5 min grace; pending queue has separate disclosed maximum | Small authenticated chunks are decrypted just in time and consumed chunks discarded with idempotent progress receipts; destroy remaining at finish/expiry |
| One-view picture | Open once; visible countdown | First view + max 300 seconds | Close/revoke/deadline, whichever first |
| One-view video | Start once; visible countdown | First start + actual clip duration + max 300 seconds | Playback completion, close/revoke, or deadline; pause does not extend deadline |

All deadlines are server-authoritative. Client clock manipulation cannot extend access. If voice is not yet heard, retain encrypted ciphertext until listened to *subject to published maximum unread retention* (candidate 7-day pilot setting, not final policy) and legal/storage safeguards. Indefinite unread retention needs explicit product/legal review; cannot mean zero storage. For group media, enforce one view **per recipient**, with separate per-device first-open claim.

## Voice implementation detail
1. Sender generates fresh random item ID and uses vetted E2EE library and keys to encrypt numbered, authenticated chunks; each chunk binds item ID, sender, recipient/group epoch, chunk index and total count.
2. Server accepts only authenticated membership and constrained size/type/expiry, keeps opaque encrypted chunks, never stores recording/transcript in plaintext.
3. Recipient makes explicit "play once" click. Server atomically locks the item to first approved device; decrypted audio only buffered in memory briefly.
4. On playback progress, client sends an authenticated monotonically increasing chunk ACK. Server expunges acknowledged chunk after confirmation; client revokes temporary object URLs and clears buffers best-effort.
5. On finish or hard expiry: revoke read token, remove all remaining encrypted chunks, dispose per-item decryption ability and mark final state. Malicious devices can spoof progress ACK: don't claim human actually listened.
6. If receipt or purge fails, report ACK_UNKNOWN or PURGE_FAILED, retry bounded cleanup and alert operator; never call deletion verified prematurely.

## Identity and invitation semantics
Device holds private signing key. QR embeds official HTTPS origin + version + public fingerprint SHA-256(public key) + unpredictable one-time invitation reference + short expiration + authenticated binding; **never private key**. Server checks signed invitation/redeem context, rate limits guesses, mutual approval and group membership. Opening a plain share URL is only a request, never an automatic connection or camera permission.

## Call behavior
Audio/video call media must use WebRTC secured transport and independently validated end-user E2EE if routed via SFU. Sender/receiver can mute, disable video, accept/reject, revoke participant; server cannot turn microphone/camera on. Network fallback uses allowed ICE/STUN/TURN/SFU paths, not covert VPN/restriction avoidance. Never record or save call stream or call transcript by default. A PWA may not receive calls reliably if the operating system closes it; push permission and native alternatives need testing.

## Contract tests prior to prototype release
- Two simultaneous browser/device opens -> exactly one winner, second ALREADY_OPENED.
- Replay of QR, reused tokens, unsigned identity, wrong group epoch and browser clock tampering -> rejected.
- Voice chunk ACK advances once, no repeat on reconnection; crashes during cleanup -> explicit PURGE_FAILED then audited retry.
- Image expires within 300s of first reveal even on pause or reload.
- Video expires within duration + 300s from first play, independent of pause.
- Voice waiting unread is encrypted; no unauthorised previews or notification excerpts.
- Group membership removal and signed rekey prevent removed member from reading future content.
- XSS injection, malicious SVG/HTML uploads, oversized video, fake media types, CSWSH and rate-limit attacks rejected.
- Media E2EE remains opaque to an untrusted SFU; direct peers do not receive IP candidates in relay-only privacy configuration.
- No secret keys, plaintext snippets, raw codes, auth tokens or private media in logs, backups or browser cache.
- Real Android Chrome/other browsers, Saudi carrier networks and actual group call load tested; PASS/FAIL/PARTIAL/UNKNOWN explicitly recorded.
- Regulatory and PDPL retention/deletion/export issues reviewed before public service.

## Reference standards
WebRTC RFC 8827: https://www.rfc-editor.org/rfc/rfc8827.html
MLS RFC 9420: https://www.rfc-editor.org/rfc/rfc9420.html
WebRTC IP privacy RFC 8828: https://www.rfc-editor.org/rfc/rfc8828.html
OWASP WebSocket security: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
OWASP cryptographic storage: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
SDAIA PDPL: https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/details/PDPL2/
