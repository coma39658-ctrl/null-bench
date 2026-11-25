# E-ZERO Connect Global Rebuild Plan
Date: 2026-11-25
Status: isolated staging evaluation; no production changes

## Objective
Rebuild the call/connect path around independently documented, managed realtime components so that the product does not depend on a fragile custom WebSocket + peer-to-peer media stack. Preserve E-ZERO's product identity, verified one-time QR pairing, trusted-friend records, simple Urdu/English/Arabic UI, and explicit user consent.

## Global platform shortlist (documentation and published pricing checked 2026-11-25)

| Candidate | Web + Android | Media/signaling | Published free allowance / cost | Evaluation |
|---|---|---|---|---|
| Cloudflare RealtimeKit | Web, Android, iOS, React Native | Managed signaling and SFU media; UI Kit or Core SDK | 10,000 audio/video participant-minutes and 10,000 audio-only participant-minutes monthly; then $0.002 A/V participant-minute and $0.0005 audio-only participant-minute | Primary proof-of-concept candidate: aligns with existing Cloudflare account and provides web + Android SDKs |
| LiveKit Cloud / self-hosted | Web + native Android and other SDKs | Managed or self-hosted SFU; SDKs handle realtime room transport | Cloud Build plan lists 5,000 WebRTC participant-minutes and 100 concurrent connections included; self-host option available | Strong fallback if RealtimeKit integration or regional/device testing fails |
| Agora RTC + Signaling + Chat | Web + Android | Managed RTC, separate signaling and chat products | RTC first 10,000 combined minutes/month free; separate Signaling first 1M messages/month free; Chat first 500 MAU free | Strong alternative, but multiple product surfaces and separate service contracts |
| Daily | Web + mobile SDKs | Managed WebRTC platform | 10,000 free minutes/month advertised | Backup candidate; verify Android native requirements and call lifecycle in a PoC |
| VideoSDK | Web + Android SDKs | Managed RTC | $20 signup credit; pay-as-you-go published | Backup candidate; usage economics and token workflow need validation |
| Supabase Realtime / Ably / Pusher / PubNub | Web/mobile clients | Messaging/presence/signaling only; not a replacement for media SFU by themselves | Free tiers vary by provider and plan | Evaluate only if a separate messaging/presence transport is needed |

## Proposed clean architecture

1. **E-ZERO identity and trust remain application-owned.**
   - Keep P-256 device identity, signed one-time QR invite, fingerprint verification, recipient's one Accept, bilateral proof verification, and locally saved trusted-friend records.
   - A saved friend must reconnect without scanning QR again.
   - Do not weaken signature, replay, expiry, or explicit-consent checks.

2. **Realtime media candidate: Cloudflare RealtimeKit.**
   - Replace the custom call-offer/answer/ICE signaling and P2P media negotiation in the new PoC with RealtimeKit rooms and Web/Android SDKs.
   - Backend creates meeting/participant credentials only after checking the authenticated saved-friend relationship.
   - Do not expose Cloudflare API tokens to clients.
   - Keep existing browser WebRTC implementation untouched as rollback/reference until the new PoC passes.

3. **Android incoming-call delivery: Firebase Cloud Messaging + Android Telecom.**
   - Register FCM token per app installation and bind it to the authenticated E-ZERO device identity.
   - Send only short-lived, signed call invitation metadata; never include media credentials or private keys in push payloads.
   - On receipt, display the call immediately using Android CallStyle and integrate with Core-Telecom/self-managed calling APIs for call state, answer/reject, audio focus, and routing.
   - Request full-screen intent only where permitted for a genuine calling app; gracefully handle denial and OEM restrictions.
   - FCM high priority is an attempt to wake a sleeping device, not a guarantee of delivery. Measure delivery on real devices.

4. **Messaging and profiles.**
   - Keep E-ZERO's own encrypted message/profile data model; use a managed realtime channel only for delivery/presence where appropriate.
   - Preserve own DP and verified friend's DP/name, text, voice notes, and image sharing.

## Staged proof gates (do not ask user to repeat old QR tests)
- G0: Verify provider account/SDK eligibility and exact Web + Android versions; no billing or production changes.
- G1: Automated browser + Android emulator/device build with a disposable test identity; room token authorization and expiry tests.
- G2: Automated two-client room join, audio track, video track, reconnect, network interruption, and explicit accept/reject tests.
- G3: FCM token registration, signed push validation, foreground/background/killed-process notification tests, and Android Telecom answer/reject lifecycle.
- G4: One controlled physical two-phone test only after G0-G3 are green; capture exact result and logs once.
- G5: Release review; no production deployment or merge without explicit approval.

## Cost and evidence rules
- Published free quotas are not a promise of unlimited use. Track participant-minutes, egress, signaling, push, storage, and any TURN charges.
- No paid plan, credit card, billing switch, secret provisioning, Firebase project deletion, account change, or production deploy without explicit approval.
- Distinguish automated CI, emulator, physical-device, and production evidence. Never report one as another.
- Avoid repeated tests that do not exercise a new failure hypothesis.

## Decision
Start with Cloudflare RealtimeKit as the primary clean-room media/signaling proof-of-concept because it offers both Web and Android SDKs, managed signaling/media, and a published monthly free allowance. Keep LiveKit as the first fallback. Firebase FCM + Android Telecom is a separate mandatory workstream for native incoming-call ringing; a web page or ordinary push notification alone does not satisfy that requirement.
