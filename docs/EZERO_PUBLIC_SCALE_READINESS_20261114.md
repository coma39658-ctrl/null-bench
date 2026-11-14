# E-ZERO Secure App — Public Scale Readiness (2026-11-14)

**Status: ARCHITECTURE PLAN / NOT A CAPACITY CERTIFICATION**

## Goal
Support an unbounded *population* of users over time, without limiting the entire app to a two-phone pilot. A single existing 1:1 WebRTC room correctly has two participants; many independent 1:1 rooms can exist concurrently. Multi-party conferences are a separate future feature, not proof of platform population scale.

## Verified baseline vs missing evidence
- E-ZERO staging: signed 1:1 QR audio/video worked on real phones, and the isolated browser Video Swap regression and gallery repeat-selection safety tests passed.
- Actual saved-friend direct incoming calls are not yet verified on both phones. The Render static bundle intentionally replaces `enabled:true` with `enabled:false` for the Trusted Inbox candidate; do NOT bypass this until security and real delivery tests pass.
- Gallery image scan once succeeded physically; repeated scanning is only PARTIAL in real phones, even though synthetic image selection passed in CI.
- There is no measured throughput, concurrent user, TURN cost, multi-region reliability or background push evidence yet. NEVER call 100,000 simulated IDs a 100,000-concurrent-user performance test.

## Existing design and isolation
- `signaling/cloudflare/src/worker.js` resolves each cryptographically random call-room name through `env.ROOMS.getByName(room)`. Its per-room two-authenticated-party limit is intentional. This is a per-call limit, **not** a platform-wide two-phone limit.
- `signaling/cloudflare/src/trusted_inbox_candidate_v0_1.js` resolves each intended recipient's validated fingerprint through `env.TRUSTED_INBOXES.getByName(fp)`, with per-recipient `MAX_CLIENTS=8` and `MAX_FRIENDS=50` candidate guards. These guard values are NOT global user population limits; per-user UX/contact scale may need an independently tested change later.
- Cloudflare Durable Object hibernatable WebSockets support idle low-cost signaling. Never route camera/microphone or recorded media through a signaling object.
- Keep independent rooms/identities. Never store raw SDP, biometric data, calls, voice notes or private identity keys in a central contact directory.

## Architecture for expansion
1. **Public onboarding**: version-identical installable HTTPS PWA, one stable entry link and per-device user-consented identity. Friend invitations stay signed, short-lived and individually authorized.
2. **Addressing / relay**: split by target recipient identity and by random call room; one account's calls cannot reach unrelated users. Use bounded resource usage, origin verification, single-use invite credentials, expiry, rate limits, abuse controls and revocation. Back-pressure must fail safely rather than claim a successful call.
3. **1:1 media**: keep tested signed WebRTC connection engine; use ICE and STUN for direct connectivity and investigate TURN relay on restrictive networks. TURN transport/bandwidth is a separate cost and privacy decision requiring consent and a budget ceiling. Never advertise 100% reachability.
4. **Notifications**: recipient open and explicitly opted-in browser can receive foreground inbox calls; closed-tab incoming rings require an opt-in Service Worker + Web Push path with documented browser/platform limits. A push notice is not proof of media connectivity.
5. **Group calls**: add independent opt-in SFU architecture (e.g. LiveKit) only after small groups are tested; do not change frozen 1:1 engine. Preserve existing media encryption guarantees or explicitly disclose differences.
6. **Observability**: anonymous aggregated failure counts, call-setup latency, ICE success/relay share, region, uptime, budgets and throttling signals; no raw SDP, phone numbers, conversations, profile images, or contact graphs in analytics.
7. **Costs**: enforce daily/monthly request and egress budgets; alert before spending, never bill users or enable paid infrastructure automatically.

## Staged gates
| Gate | What must be proven | Status |
|---|---|---|
| G0: QR/audio/video baseline | Signed 1:1 and regression PASS | PARTIAL: real successful tests and isolated regression; network matrix incomplete |
| G1: Saved-friend direct calling | Actual two phones, named friend, opt-in inbox, ringing, explicit accept and no QR after first verification | FAIL / NOT RELEASED |
| G2: Gallery QR | Repeated fresh QR from gallery, expired/reused/foreign QR fail closed, Android/browser matrix | PARTIAL |
| G3: 100 users pilot | Peak concurrent rooms, call setup latency, first-call acceptance, errors, cleanup | UNKNOWN |
| G4: 1,000-10,000 users | Distributed *real load*, regional tests, reconnect, TURN fallback and cost | UNKNOWN |
| G5: 100,000+ population | Measured DAU/MAU and concurrent session load, multi-region resilience, bounded costs, monitoring | UNKNOWN |

### Test methodology
- **Static/synthetic checks** verify per-identity and per-room routing shape and that generated identifiers are unique in a bounded sample. They are NOT live socket, connection-rate, throughput, capacity or latency benchmarks.
- **Load tests** on isolated, explicitly budget-capped staging should eventually generate 100 then 1,000 then 10,000 concurrent WebSocket connections across many independent Durable Objects. Do not target production, real users or Cloudflare resources without separately reviewed load-test approval and a cost ceiling.
- **Physical acceptance** requires multiple real phones on Wi-Fi and mobile data, foreground and background notification scenarios, QR gallery repeat scans and saved-friend direct calls.
- Preserve the pinned frozen WebRTC browser regression and success status, maintain PASS/FAIL/PARTIAL/UNKNOWN, and keep all changes off `main` until reviewed.

## References (official)
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Cloudflare limits: https://developers.cloudflare.com/durable-objects/platform/limits/
- Cloudflare Workers requests / billing: https://developers.cloudflare.com/workers/platform/limits/
- WebRTC ICE / STUN / TURN: https://webrtc.org/getting-started/peer-connections
- Web Push with Service Workers: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
- Multi-party SFU: https://docs.livekit.io/reference/internals/livekit-sfu/
