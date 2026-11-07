# E-ZERO Secure App — independent HTTPS two-phone staging handoff
Date: 2026-11-07. Maintained on draft PR #122, branch `ezero-profile-first-saved-friends-20261106`.

## Published experimental URLs (NOT public production)
- **Render HTTPS test-only page:** https://ezero-secure-app-two-phone-test-20261107.onrender.com/ezero_trusted_friends_staging_20261106.html
- **Render service:** `srv-dbnis0lg1s2s73cquj1g`. `autoDeploy=no`; isolated static bundle only, no full repository publication.
- **Render deployed source commit:** `a55ec3251ec9f5e9875fd818ed437d26e264bfe8`. Deployment `dep-dbnj1l8u01pc73ct5jf0` status LIVE.
- **Cloudflare Render-only signaling Worker:** `ezero-browser-signaling-render-test.coma39658.workers.dev` with `PUBLIC_ORIGIN=https://ezero-secure-app-two-phone-test-20261107.onrender.com`; separate Durable Object and separate deployment from working `ezero-browser-signaling-pilot`.
- The staging builder keeps the production-origin Trusted Friends Inbox DISABLED on Render. The inbox is intentionally **not yet available** there because its signed handshake binds the GitHub Pages origin. QR room calling still uses signed SDP and the isolated staging Worker.
- The manifest has a preview-specific ID and name. Device keys/contacts created at the Render origin are separate from those on GitHub Pages.

## Evidence status (never conflate different evidence types)
- PASS — Render static build package CI; required page/CSS/JS/icons/privacy assets and isolated manifest built.
- PASS — Render initial HTTPS deployment and subsequent redeploy with origin-restricted staging Worker.
- PASS — new Cloudflare Worker deployment and `/v1/health` check (GitHub Actions).
- PASS — two-browser **real Cloudflare live WebSocket** test on original authorized GitHub Pages Origin.
- PASS — two-browser **real Render HTTPS + separate Cloudflare Worker** test (GitHub Actions run `42380275960`, job `128426248280`): signed WebRTC connection, mutual names and DPs, second QR video call, persistence after reload, user nickname kept, block/unblock. Two ephemeral Chromium browser contexts with fake camera/microphone capture, not physical devices.
- PASS — all 10 GitHub QA workflows on staging commit `45ff890633a056611a3410cd2c2759f63a82b9a9`.
- PASS — negative Origin 403 rejection against Render Worker (GitHub Actions run `42380556846`, step `Ensure isolated Render Worker rejects production GitHub Pages Origin`). Exact test commit: `39115e55164417bdb63da0bf62ddd9708c994b80`.
- UNKNOWN — physical Android/Android or Android/iPhone peer media: microphone audio both directions, real camera on both sides, speaker/mute and release on hangup.
- UNKNOWN — mobile data vs Wi-Fi NAT and TURN fallback (there is no configured TURN relay).
- UNKNOWN — real missed call/foreground inbox on Render (explicitly disabled); background notifications and universal cross-network calling are NOT claimed.
- UNKNOWN — full accessibility/screen reader and OS-install behavior on physical devices.

## Owner's simplest physical test, WITHOUT publishing private artifacts
1. On **both** phones, open the exact Render HTTPS test URL in a normal browser (prefer Chrome; not the embedded IMO/WhatsApp webview). Check both say E-ZERO Secure App TEST and show the same version SHA.
2. Each device creates a **separate test profile**, picks a personal DP, approves profile sharing and saves a persistent browser identity. Do not expect a Google Pages profile to migrate across origins.
3. On Phone A tap Audio or Video; show QR or privately share the invite link to Phone B. On Phone B open the invite, check Audio/Video, then press **Accept**. Link opening alone must not capture mic/camera or save friends.
4. Confirm two-way **real** audio and camera video, correct displayed self-declared name/photo on each phone, and friends saved after signed handshake. A nickname set locally must remain when the other user edits their own profile name.
5. End the call; check both phones release microphone/camera. Repeat a fresh QR video call. Re-test over separate Wi-Fi vs cellular networks only after same-Wi-Fi success; STUN/IP metadata may require explicit opt-in, and absence of TURN may cause a genuine connection failure.
6. Record P01-P16 statuses in `docs/EZERO_SECURE_APP_REAL_DEVICE_GATE_20261107.md`. Share only redacted error text and screenshots. **Never share full invite fragment, full device fingerprint, actual photo, private key or SDP** in public issues or chat.

## Release decision
**NO-GO to merge draft PR #122 into main** until physical checkpoints and release/security criteria are met. Existing public GitHub Pages communication entry, original signaling Worker, public PWA identity and user data were not altered by this staging deployment. Any new Render deployment is deliberately manual. Browser QA success is not proof of reliable production calling on real phones.
