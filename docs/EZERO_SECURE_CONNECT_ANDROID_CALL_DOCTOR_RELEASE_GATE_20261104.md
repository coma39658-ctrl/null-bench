# E-ZERO Secure Connect — Android Call Doctor (one-click phone preflight)
Date: 2026-11-04 · Owner: E-ZERO · Status: **isolated experimental branch, NOT public deployment**

## The real-world issue addressed
Two actual Android phones had an error-prone manual signed WebRTC offer/answer copying process. A separate PWA may open an older cached page on network failure because the existing `service-worker.js` uses a **network-first, offline-cache fallback**. A green QR fingerprint alone is not evidence that a call connected, and a browser's `navigator.onLine` flag does not guarantee a usable ICE/STUN/TURN route. Root causes of prior two-device failure are **not definitively established**.

## What was implemented (read-only)
- A prominent trilingual **Call Doctor** front-page panel with one clear run button, no microphone/camera permission prompt or live connection attempt.
- Check `isSecureContext`, `crypto.subtle`, WebRTC API, media capture API availability, WebSocket support, read-only browser microphone permission, approximate online/offline flag, Service Worker controller and browser tab/installed PWA mode.
- Show an explicit **not connected** result unless the existing genuine WebRTC connection-status event reports `connected`. On ICE disconnect/failure or hang-up, remove that status; do not equate QR scan, temporary offer or invitation link to a call.
- Independently stamp and compare readable **Call Doctor**, signed WebRTC core, private one-link module and Privacy Copilot builds. This helps isolate partly cached versions but **does not cryptographically attest every resource of the website**. Missing markers are flagged; do not pretend a completely old page has the Doctor installed.
- Display a copyable privacy-safe report containing ONLY generic capability results and code-component IDs. Explicitly exclude name, user agent, precise device, exact location, IP addresses, call SDP/ICE candidates, temporary QR keys/fingerprints, friend names, copied invite links and message contents. No upload, background polling, storage, analytics or phone permission action from the Doctor.
- Gracefully degrade for unsupported Permissions API: unknown does not mean granted. Report an actual denied microphone permission as a blocker without starting microphone capture.
- Warn that a camera capture API does not prove a physical camera exists and that a local self-check **does not query Cloudflare availability**.

## Manual real-Android one-visit test plan (future restricted preview)
1. Check each phone first in its installed E-ZERO PWA and then Chrome online; record **only the generic Call Doctor report** without screenshots containing secrets.
2. Compare all four component build identifiers; on mismatch reload current HTTPS webpage online rather than deleting the user's app or wiping personal contacts.
3. Confirm microphone permissions (only read state in Doctor), network indicator, original signed QR verification and identity comparison code.
4. For a real call, use the **one-link** system only after the isolated pilot Worker is independently enabled under a securely stored owner secret and restricted room budget. Never ask friends to paste raw SDP or to post private tokens in ChatGPT.
5. Test same-Wi-Fi and separate-carrier connections, microphone denial, backgrounded browser, explicit remote decline and unexpected peer disconnect. Record WebRTC `connected` observation separately from successful **two-way audible speech**. Without a TURN relay some carrier paths can fail.
6. Do not use a generic local preflight as permission for Cloudflare deployment, public launch, billing or automatic AI speech recognition.

## References
- Cloudflare Durable Object WebSocket Hibernation, https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- MDN RTCPeerConnection.connectionState, https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionState
- MDN RTCPeerConnection.iceConnectionState, https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState
- Cloudflare Durable Objects limits, https://developers.cloudflare.com/durable-objects/platform/limits/

**Evidence level:** local static contract and simulated two-mobile Chromium checks are software observations only. Real Android physical success and independent security audits remain NOT VERIFIED. Existing Cloudflare staging remains `ROOMS_ENABLED=false`. No public site merge or worker mutation in this branch.
