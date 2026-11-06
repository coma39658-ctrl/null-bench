# E-ZERO Secure Connect — Verified Regression Baseline (2026-11-06)

## Status and scope
This is a **frozen, reproducible software regression reference** for the working E-ZERO Secure Connect public QR/browser connection UI at the 2026-11-06 checkpoint. It is not proof of real-world audio quality, independently validated encryption, universal mobile compatibility, or production readiness.

| Evidence | Value |
| --- | --- |
| Original passing PR head | `a1815e85acfe8a8340c866b02b98d6f1324681c7` |
| Public squash merge | `43e0579c1587435a74a618b8aeab4bb0864e052d` |
| Frozen baseline branch | `ezero-verified-green-connect-20261106-baseline` |
| Pinned frozen commit | `43e0579c1587435a74a618b8aeab4bb0864e052d` |
| Scope | `coma39658-ctrl/null-bench` |
| Verification level | GitHub CI + user-observed real two-phone video; audio playback NOT yet verified |
| Explicitly not yet passed | Human-audible two-way audio, mobile voice note delivery, chat delivery on physical two phones, optional filters |

## Eight CI runs previously completed with SUCCESS
The following eight PR-head workflow runs reported `completed/success` on the same head SHA:

1. [E-ZERO AI Studio Local Video Frame and Consent Browser QA](https://github.com/coma39658-ctrl/null-bench/actions/runs/42190590629)
2. [E-ZERO One Request + One Accept WebRTC Pilot QA](https://github.com/coma39658-ctrl/null-bench/actions/runs/42190590624)
3. [E-ZERO Secure Connect Signed QR and Real P2P Call Lab QA](https://github.com/coma39658-ctrl/null-bench/actions/runs/42190590709)
4. [E-ZERO Unified Public Green Connect Release Gate](https://github.com/coma39658-ctrl/null-bench/actions/runs/42190590697)
5. [E-ZERO AI Studio Voice Share and Install QA](https://github.com/coma39658-ctrl/null-bench/actions/runs/42190590720)
6. [E-ZERO Secure Connect Local Device Preview QA](https://github.com/coma39658-ctrl/null-bench/actions/runs/42190590579)
7. [E-ZERO Immersive Video Call and Incoming Ring Lab QA](https://github.com/coma39658-ctrl/null-bench/actions/runs/42190590781)
8. [Evidence Registry Validator](https://github.com/coma39658-ctrl/null-bench/actions/runs/42190590599)

**Important:** Each `SUCCESS` means that *that workflow's own automated assertions* succeeded in its test environment; it does not certify all user-visible features or physical call audio.

## Regression lock
The companion workflow `.github/workflows/ezero_secure_connect_frozen_regression_gate_20261106.yml`:

- Runs on **every pull request to main**, not just updates to select HTML/CSS files; also runs on pushes to main.
- Fetches the frozen baseline branch and verifies its exact pinned commit SHA, failing closed if it moves.
- Restores the two original November 6 browser regression scripts from the frozen source, independently of the proposed PR's editable test files.
- Runs those *frozen* two-phone Chromium QR/audio-signaling and video/PiP tests against the **proposed new code**, then runs the current branch's versions as additional checks.
- Runs without access to Cloudflare deployment tokens or mutating production services.

The frozen branch must not be rebased, force-pushed or used as a development branch. To change a frozen contract intentionally, document the change, obtain review, establish a **new** baseline branch/commit and update the gate with the new SHA in a separate explicit PR. Keep the prior baseline available.

## Not an unconditional guarantee
A CI workflow cannot make future defects impossible. Repository maintainers can alter workflow files or bypass checks unless GitHub branch protection / rulesets enforce required status checks. To make this a mandatory merge block, enable repository **Settings → Rules → Rulesets** (or branch protection for `main`) requiring the status **E-ZERO Frozen Secure Connect Regression Gate / frozen-two-phone-contracts** and other critical checks, and block bypass/direct pushes where the plan allows. This safeguard is *recommended*, not claimed as already enabled.

## Future work (not counted as successful tests)
1. Diagnose **one-way/two-way call playback**, explicitly testing both phones' received audio and whether the speaker is muted, routed to earpiece or blocked by autoplay.
2. Verify voice message record → send → receive → tap-to-play in two browsers and real phones, with browser encoding/codec compatibility and no false delivery receipts.
3. Verify private text chat send → receipt → explicit one-time open with no server archive.
4. Add optional visual preview filters and audio-processing presets only behind opt-in controls and only after the baseline stays green.
