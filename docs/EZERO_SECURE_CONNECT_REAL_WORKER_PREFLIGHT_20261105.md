# E-ZERO Secure Connect — real Cloudflare Worker runtime proof before Android pilot
Date: 2026-11-05 · Developer evidence only · No live public calls

## Important regression caught by actual runtime
Earlier synthetic browser and fake-Durable-Object tests passed; Wrangler dry-run and DISABLED production health smoke did not test local Worker startup with the feature enabled.

`wrangler@4.157.0 dev --local` refused to start the Worker entrypoint with:
`Incorrect type for map entry 'MAX_PILOT_ACTIVE_ROOMS': ... not ... function or ExportedHandler`.

The root cause was exporting primitive constants from the Worker entrypoint alongside handlers and Durable Object classes. They are now **imported** from `room_constants.mjs`; the Worker entrypoint exports only `default.fetch`, `CallRoom` and `RoomAdmission`. Existing Node unit test imports the constants from their own module. This was an actual deployment-compatibility blocker previously unseen in synthetic tests.

## New workerd WebSocket integration test
GitHub Actions starts **only a local loopback worker** with an obviously synthetic 64-character owner value and a local override `ROOMS_ENABLED=true`, which is never deployed. JavaScript WebSocket clients use the same Cloudflare worker protocol and an exact allowed Origin. The script explicitly rejects any non-loopback URL, never accesses real Cloudflare credentials, and never calls a microphone or camera.

Validated using the real Worker routing, WebSocket 101 Upgrade, Durable Object SQLite storage and Hibernation APIs:
- Expected local health reports `STAGING_ENABLED`.
- Wrong Origin and fake HMAC capability are denied before admission, old timestamp denied.
- First phone connects as caller; second as callee. A third phone is rejected.
- Offer before callee approval is rejected, then explicit accept works.
- Encrypted opaque Offer and Answer are delivered between two *real WebSocket connections*; plaintext SDP is not delivered to the relay.
- Hangup closes both sockets and reuse of room is denied.
- Decline prohibits further application messages, revokes the room and denies reuse.

**Technical nuance:** In the local runtime, after a Decline, the receiver's WebSocket can stay briefly in WebSocket `CLOSING` state rather than `CLOSED`. The test requires neither socket to remain `OPEN` and the room tombstone to deny replay; it does not falsely claim immediate full TCP closure. The actual browser's decline handler also initiates its own close. Test network interruptions and cleanup on two physical devices before production.

Last PASS CI: https://github.com/coma39658-ctrl/null-bench/actions/runs/41951820450

## Evidence ladder
1. Source-level/static verification — PASS
2. Node synthetic Durable Object and two-browser WebRTC — PASS (existing)
3. **Real local workerd two-WebSocket signaling and cryptographic authorization — PASS**
4. Remote public Cloudflare Worker when still DISABLED — read-only health smoke required
5. Actual remote Cloudflare pilot with one-time owner secret — NOT ENABLED or verified
6. Two physical Android phones, bidirectional audio/video, other carrier/WiFi — NOT VERIFIED
7. Independent security review and broader pilot/public release — NOT VERIFIED

## Next release gates
- First update **only** the isolated Cloudflare `ezero-secure-connect-call-lab-disabled` Worker with the fixed entrypoint. Require source gate, real local workerd CI and read-only pre/post remote health to report `STAGING_DISABLED`, room GET 503. No change to public site or existing AI Workers.
- Configure a **unique random 256-bit `PILOT_OWNER_SECRET`** through Cloudflare private secret controls with the operator; never print it in chat, source, git, logs or screenshots. The synthetic test value must NEVER be used remotely.
- Independent review of the owner-key browser textbox and invitation link handling. If compromised, a forwarded current link could still seize the guest seat.
- For actual limited test, use a **separate, time-bounded, opt-in** live staging environment with explicit small pilot admission (max 8 room IDs, 2 peers per room), monitoring and manual kill switch; do not silently open the global public site.
- Test two real Android phones with mic/media permissions, no TURN (failure likely on some networks), read-only failure diagnostics, background closing and both-party consent.
- Do NOT describe it as an independently audited messenger, universal connectivity, impossible to hack or completed physical call.

References:
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/workers/local-development/
- https://developers.cloudflare.com/workers/local-development/environment-variables/
