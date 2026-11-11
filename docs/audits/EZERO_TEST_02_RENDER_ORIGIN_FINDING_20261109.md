# TEST 02 — Render origin mismatch: static code finding

Date: 2026-11-09. Owner-provided screenshot of Render TEST shows a saved friend and the exact UI message: “محفوظ دوستوں کی کال سروس دستیاب نہیں؛ QR استعمال کریں۔” Result: saved-friend direct-call FAIL (owner observed). Do not include the screenshot or user profile details in public repository.

## Source inspection (frozen TEST commit 51d7aec556dec935d74edf339d86f3794f5aa865)
- js/ezero_trusted_friend_foreground_client_candidate_v0_1.js lines 13-15 hard-code GitHub Pages origin and call page.
- Same file lines 32-36: enabled() requires CONFIG.enabled, valid WSS, secure context, crypto, and **location.origin===ORIGIN**.
- js/ezero_trusted_friends_controls_candidate_v0_1.js lines 13-14 returns immediately when LAB.enabled() is false.
- js/ezero_contact_first_call_dock_v0_1.js lines 242-250 requires window.EZERO_TRUSTED_SAVED_CALL.prepare; otherwise it displays the unavailable-service message.
- TEST HTML loads both candidate files. The actual Render-built asset bytes and config are not yet verified.

## Assessment
CONFIRMED static source gate: Render origin does not equal GitHub Pages origin; if this gate remains in served Render assets, direct-call controls will not initialize. Strong candidate root cause, not yet a verified live server diagnosis. Do NOT simply remove the origin check: doing so would weaken the trust boundary. Fix only with an explicit allowlist, correct per-origin call URLs, signed device identity, and secure signaling configuration on isolated staging; verify CSP, WSS, CI, regression and two-phone call card/accept/media before any release.

## Current status
QR audio PASS, QR video PASS: owner-observed physical tests. Direct saved-friend call FAIL: owner-observed screenshot. Render live asset SHA UNKNOWN; CI UNKNOWN; production untouched. NO RELEASE.
