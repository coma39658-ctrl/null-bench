# E-ZERO Secure App — Consolidated Product Map (2026-11-13)
Status: USER-REQUIRED SCOPE / ARCHITECTURE BLUEPRINT, NOT CLAIMED IMPLEMENTED.
Preserve proven two-phone WebRTC audio/video baseline; no production changes.

## Product identity and experience
Military green + red accents, fast lightweight single-screen mobile-first PWA; Urdu, Arabic, English end-to-end, RTL, back button everywhere. WhatsApp-like chats/calls/friends/privacy tabs, composer (+, text, microphone, send), contextual panels open at the pressed control, never jump to page bottom. Profile name + DP before trust save. No ads or data sale. Explicit consent for storage, media, notifications, AI.

## First-time identity and friends
Passkeys/WebAuthn as optional convenient sign-in, device-bound cryptographic keys; stable opaque Secure ID. Opt-in discoverability. Short single-use signed invite link or QR OPTIONAL; receiver accepts; both store authenticated public-key identity, profile name/photo, local nickname overrides, search, friend share, block/delete, device-key change alert, trusted one-tap reconnect. Never silently trust unverified IDs.

## Messaging
One-to-one text, emojis, reactions, reply, forward, edit, delete, search, sent/delivered/read receipts, attachment picker, photos, videos, documents, link sharing, location with consent, voice notes, in-call chat, multiple conversations. Offline encrypted queue with bounded retention, retries, deduplication and delivery ACK; WebRTC data channels are an optional online transport, not an offline inbox.

## Voice notes
Record with timer, pause/resume, preview, cancel, multiple notes, playback speed, optional transcript/translation, consented share/download. No arbitrary 5-second cap; resource limits to be measured and documented. Preserve provenance, optional SHA-256 evidence manifest, no claim that a hash proves speaker identity.

## Calls
Audio/video 1:1, ringtone, incoming accept/decline, missed/received logs, mute/speaker/camera flip, video on/off, hangup, network recovery, optional 2–4 beauty filters with privacy/performance guard. Group calling only after verified 1:1 baseline and scalable SFU architecture, not a fragile mesh assumption. Do not claim guaranteed browser-background ringing.

## Groups
Group creation, admins, invitations, permissions, member management, group text/media/voice notes, group audio/video as independently gated feature.

## Privacy
WebRTC encrypted media; independently reviewed E2EE for asynchronous messages and files; authenticated key verification; short-lived signed call requests, replay protection, origin allowlists, rate limits, block/revoke, user-consented push. View-once and optional viewed+10min expiration with realistic limits (recipient may capture content). Downloads only during allowed window; SHA-256 plus signed evidence manifest for optional Evidence Mode. No server call recording; any optional recording requires explicit consent of participants. Accurate retention disclosures; server may transiently store ciphertext for offline delivery. Avoid absolute privacy or security guarantees.

## AI features (opt-in only)
Urdu/Arabic/English translation, voice-note transcription, accessibility assist, suggested reply and network-quality hints. No background scanning of private chats, uploads or cloud AI without specific consent. No unsupported diagnostic claims.

## Implementation order — few meaningful tests
GATE A: single origin, authenticated Secure ID, friend request, recipient approval and persistence; test with synthetic users.
GATE B: real inbox delivery ACK, block/replay/expiry/offline; distinguish QUEUED/DELIVERED/RINGING/ACCEPTED/CONNECTED.
GATE C: frozen audio/video WebRTC engine integration, one audio and one video two-device acceptance test.
GATE D: encrypted text chat and offline delivery with one two-device test.
GATE E: voice notes and media transfer with one two-device test.
GATE F: groups, optional AI and enhancements after core reliability.
Automate CI/backend contract checks; do not send users to repeated phone tests until backend health and delivery pass. No merge/production deployment without evidence. Keep old working public version intact.

References: W3C WebAuthn; MDN WebRTC DataChannel; OWASP ASVS 5.0; Signal view-once/disappearing media UX.
