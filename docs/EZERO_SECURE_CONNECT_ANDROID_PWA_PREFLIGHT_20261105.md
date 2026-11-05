# E-ZERO Secure Connect Android PWA readiness — one-tap preflight

Date: 2026-11-05 · Status: experimental draft, NOT deployed to the public app

## Why
Physical Android phones previously displayed old installed PWA pages and generic copy/paste errors during manual SDP calls. Repeatedly reinstalling or reloading a live call is unsafe and frustrating. This small preflight shows what is locally knowable without asking for media permission or claiming server-call success.

## One explicit button
1. In the collapsed "📱 Android · ایپ کی حالت اور کال کی تیاری" panel, the user taps "فون اور ایپ کی حالت چیک کریں".
2. Check secure context and HTTPS, Web Crypto, RTCPeerConnection, and presence of a browser microphone/camera permission API **without calling it**.
3. Show installed app vs browser, whether an active Service Worker registration is detected, and `navigator.onLine` as a **hint only**, not proof of internet reachability.
4. Run exactly one same-origin GET of this page with `cache:no-store` and request header `X-EZERO-Readiness-Probe:v1`. The service worker excludes only this exact page and explicit header from its offline cache handler, allowing the browser network stack to determine availability. Compare the public HTML build marker to this loaded app build marker. Never send fingerprints, SDP, QR, tokens, network candidates, media, contacts or user text.
5. Clearly show fresh match / different build / unknown (offline, no marker or failed fetch). A different build is not automatically installed, and **no page reload is ever triggered**. Close any call before voluntarily reopening the app.
6. State that Cloudflare live one-link rooms remain disabled. Local WebRTC capability alone does not constitute an established or audited end-to-end call.

## Safety boundaries
- The UI runs only on explicit tap, once per tap, no background polling or scheduled refresh.
- No `getUserMedia()`, `MediaRecorder`, WebSocket opening, third-party requests, writes, cache deletion, service-worker unregister or reload.
- 8s bounded no-store same-origin network probe; no forced prompts, no telephony/camera permission.
- The readiness panel is trilingual Urdu/English/Arabic and stays collapsed by default to keep the main call interface simple.
- `service-worker.js` keeps the existing app's network-first cache fallback for ordinary requests; only the exact page+explicit header bypasses cache. **This requires the updated service worker itself to have been installed.** Older installed PWA service workers cannot be remotely overridden by this new JS alone; an old/offline cache might still deceive a freshness probe until the new SW takes control. Never claim universal proof.
- The user cannot run live one-link calls while `ROOMS_ENABLED=false`. No cloud deployment or public `main` merge here.

## CI gates
- New Playwright mobile viewport test checks no probe until user action, exactly one same-origin fresh probe, stable matched build, no media activation, unverified when network blocked, three-language switching and no mobile horizontal overflow.
- Regression runs signed-QR/fingerprint Copilot security, encrypted one-link two-Chromium-WebRTC lab, legacy audio/video and one-time DataChannel tests.
- Real-device Android testing (installed PWA with old/current SW, Chrome direct, mobile data, airplane mode, exact IP/network connectivity, spontaneous tab close) still pending.

**Do not market this readiness feature as proof that a human caller, genuine voice call, or remote AI service is connected.**
