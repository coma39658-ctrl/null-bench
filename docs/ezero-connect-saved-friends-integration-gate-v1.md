# E-ZERO Connect — Saved Friends Integration Gate

Date: 2026-11-20  
Status: **STAGING / integration preparation**  
Base: `ezero-connect-public-visual-preview-20261119` at `d8e1203bdc6fbc5e2f02ac8bad5a56ff3f4004c7`

## Goal

Preserve the approved E-ZERO Connect visual preview and integrate the independently tested Saved Friends / direct-redial work without replacing the frozen audio/video engine or changing production.

## Verified evidence from the existing Saved Friends candidate

Source branch: `ezero-visible-save-friend-cta-20261115`, head `373ab6266fe54fe894dea5d011f06acc1ffdd03b`.

The following GitHub Actions checks completed successfully on that source head:
- `original-saved-friends-noqr`
- `contacts-then-video`
- `two-mobile-chromium`
- `signed-identity-and-ui`
- `mobile-browser` (two runs)
- `contract`
- `safe_preview`
- `safety-and-regression`
- `validate-evidence`
- `frozen-two-phone-contracts`

The original-saved-friends-noqr job log records:
- First QR pairing, then two repeated video call cycles without showing a QR prompt.
- Both phones retained the saved friend names across the cycles.
- Revoked trust failed closed without forcing a QR prompt.
- A deliberate fresh QR flow still worked and did not erase saved contacts.
- The job explicitly labels its evidence as isolated two-browser WebRTC with a mocked Worker, **not** physical-phone or live-Cloudflare proof.

The contacts-then-video job records contact selection before media permission, a real browser camera track in the isolated Chromium test, and remote camera shutdown on hangup.

## Integration constraints

1. Keep `ezero-connect.html` as the approved visual direction. Do not replace its layout with the older technical staging page.
2. Do not merge the Saved Friends branch wholesale. It is materially divergent from this preview branch (10 commits ahead, 22 behind at the comparison point); its full HTML and workflow history must not be imported as a unit.
3. Port only the smallest required UI/controller changes after a reviewed diff. Preserve the original call engine and existing incoming-call behavior.
4. Saved contact selection must not request camera/microphone permission. Media permission is requested only after the user explicitly starts an audio/video call.
5. No-QR redial is allowed only for a previously saved, still-authorized device identity. Revocation, key mismatch, or unknown identity must fail closed with a clear status.
6. Do not claim permanent online status, missed-call detection, background ringing, push notifications, E2EE messaging, or physical-device compatibility without separate implementation and evidence.
7. Keep all work on isolated branches and preview services. No production deploy, merge to the default branch, account creation, or paid service activation in this phase.

## Required integration sequence

- [ ] Map the visual preview's approved navigation and contact entry points to the Saved Friends controller.
- [ ] Identify exact DOM dependencies and event contracts used by the Saved Friends controller; document collisions before editing.
- [ ] Extract the minimal controller into a separately named module with no edits to the frozen WebRTC engine.
- [ ] Add a clean-preview adapter that exposes the same tested controller contract without importing the old page's duplicate controls.
- [ ] Run static/security checks and all existing E-ZERO regression workflows.
- [ ] Run isolated two-browser tests for first QR pairing, save, repeated no-QR redial, audio/video mode integrity, revocation, contact retention, and hangup cleanup.
- [ ] Deploy only to an isolated preview after CI passes.
- [ ] Perform physical Android-to-Android checks across same Wi-Fi and separate networks before any production release decision.

## Release truth

This branch is **not** a functioning production messenger. The public visual preview remains a visual/navigation preview. The Saved Friends test evidence is valuable and repeatable, but it is not evidence of live Cloudflare Worker delivery or physical-phone operation. Production remains untouched.
