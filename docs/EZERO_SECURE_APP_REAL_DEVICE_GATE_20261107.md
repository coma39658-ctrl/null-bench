# E-ZERO Secure App — Physical Two-Phone Release Gate
Date: 2026-11-07
Owner: E-ZERO
Scope: draft staging PR #122; preserve all existing main/public call behavior.

## Evidence policy
Do **not** confuse (a) mocked Cloudflare signaling with actual cloud connectivity; (b) simulated media tracks with physical phone audio/video; (c) self-declared names/photos with real-world identity verification.
Mark each checkpoint PASS / FAIL / PARTIAL / UNKNOWN. Stop release on unresolved FAIL or UNKNOWN in essential call, consent, signature, privacy, or identity checks.
No public production merge, PWA replacement, backend change, telemetry upload or secret rotation is authorized by completing this checklist.

## Preconditions
1. Confirm GitHub Actions on the exact staging SHA, with all existing 9 workflows green. Record the SHA and check URLs.
2. Confirm a separately deployed, owner-authorized *staging* HTTPS URL that serves the same PR #122 build to both phones. **Do not** assume the existing public GitHub Pages path is a preview of an unmerged PR.
3. Two real devices (A/B), each with current compatible browser and working microphone/camera. First test on the same Wi-Fi, then on two different networks. Avoid embedded WhatsApp/IMO browser; choose the system browser.
4. Do not write real phone numbers, private keys, full device fingerprints, photos, invite fragments or QR tokens into issue comments, screenshots, logs or chat. Record only abbreviated identifiers and redacted error codes. Obtain consent for any evidence sharing.
5. Cloudflare signaling endpoint may be reachable while end-to-end media is still not routed. STUN may expose IP/network information and must remain opt-in; cross-NAT calls require evaluation of a suitable TURN relay and costs. No guarantee of successful cross-network connectivity without it.

## Physical test matrix (record A + B results independently)
| ID | User action / observable pass condition | A | B |
|---|---|---|---|
| P01 | Both phones load **the same staging build** (URL/version visibly matches) and show one simple first-QR flow | UNKNOWN | UNKNOWN |
| P02 | Unsaved profile prevents call/invite/media; each user enters name, selects DP, approves profile sharing and saves stable browser identity | UNKNOWN | UNKNOWN |
| P03 | A sends one short QR or protected invite link; B sees correct incoming request; opening link alone never adds a contact or opens mic/camera | UNKNOWN | UNKNOWN |
| P04 | B accepts explicitly; one signed WebRTC offer/answer verifies identities; reject, expired token, bad signature and block all fail safely | UNKNOWN | UNKNOWN |
| P05 | Audio is intelligible in **both** directions, with actual phone microphones/speakers; mute/speaker behavior visible | UNKNOWN | UNKNOWN |
| P06 | Video opens only after permission; both local and remote **physical camera** video are visible; no phantom green connected display | UNKNOWN | UNKNOWN |
| P07 | A sees B's **self-declared** profile name and DP; B sees A's; saved contact keys match signed fingerprint; no automatic unverified identity substitution | UNKNOWN | UNKNOWN |
| P08 | Friend appears on both phones after confirmed mutual handshake (no second Save Friend tap). A user-created local nickname remains intact after remote profile update; both names remain searchable | UNKNOWN | UNKNOWN |
| P09 | End call on A: B receives end state, media tracks stop and camera/mic release; repeat from B | UNKNOWN | UNKNOWN |
| P10 | Reload app: same non-exportable local device identity and saved friends persist when storage is available; private mode/storage denial fails transparently | UNKNOWN | UNKNOWN |
| P11 | New QR after first call works; saved friend can be selected and audio/video started by a deliberate tap; no call occurs on drawer opening | UNKNOWN | UNKNOWN |
| P12 | Incoming requests when browser is open, ringing and accept/decline work. Do **not** claim background calling or push notifications unless separately proven | UNKNOWN | UNKNOWN |
| P13 | In-call messages and voice notes transfer both ways only under verified connection; no covert upload/recording; delete/view-once claims match actual enforcement | UNKNOWN | UNKNOWN |
| P14 | Block friend: local contact removed and signed incoming request rejected; unblock requires a conscious action | UNKNOWN | UNKNOWN |
| P15 | Share/Install/Back/language (Urdu, Arabic, English) work on both phones; remote link copies and opens without losing the capability fragment | UNKNOWN | UNKNOWN |
| P16 | Different networks (mobile data vs Wi-Fi): signaling + WebRTC audio/video verified. If ICE fails, show clear network/TURN reason without fake success | UNKNOWN | UNKNOWN |

## Reporter template
- Staging SHA / URL version: UNKNOWN
- Phone A OS/browser + network (without identifying details): UNKNOWN
- Phone B OS/browser + network (without identifying details): UNKNOWN
- Test Pxx: PASS/FAIL/PARTIAL/UNKNOWN
- Exact visible error code (redacted): UNKNOWN
- Which phone, what user action, which observable state: UNKNOWN
- Was microphone/camera release confirmed on hangup?: UNKNOWN
- Did local nickname survive a remote profile update?: UNKNOWN

## Decision
**NO-GO** until the new staging build has been deployed to an isolated URL, its 9 workflows have passed for the exact commit and essential physical checkpoints P01-P11, P14 and P16 are PASS; P12-P13/P15 must have truthful, visible capability labels and no misleading release claims. A physical test cannot be replaced by a browser-simulated CI success.
Existing public site, main branch, manifest IDs, saved user data and live signaling workers remain untouched until separate release review.
