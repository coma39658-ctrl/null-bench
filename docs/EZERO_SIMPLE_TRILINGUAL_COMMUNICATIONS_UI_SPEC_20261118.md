# E-ZERO Simple Trilingual Communications UI — Binding Staging Specification

**Date:** 2026-11-18  
**Branch:** `ezero-pr156-render-preview-20261116`  
**Status:** UI requirements approved; implementation and automated acceptance remain pending.

## Product objective

Make E-ZERO Secure Connect immediately understandable to an ordinary first-time user. The interface must be purposeful, compact, modern, uncluttered, responsive, and easy to operate on a low-cost Android phone. Do not imitate WhatsApp branding or assets; adopt familiar interaction patterns only.

## Three complete languages

- Supported languages: Urdu (`ur`), Arabic (`ar`), and English (`en`).
- The language selector stays visible and changes the entire user interface, not only the home panel.
- Urdu and Arabic use correct RTL layout, direction-aware spacing, mirrored navigation where appropriate, and readable Arabic-script typography. English uses LTR.
- No mixed-language screen after switching. All visible labels, buttons, placeholders, validation errors, incoming-call states, call status, voice-note controls, privacy/permission explanations, empty states, accessibility labels, and error messages must be translated.
- Persist the user's chosen language locally and restore it on reload. Do not infer language from sensitive personal data.
- Keep names, user-entered messages and friend names unchanged; do not machine-translate user content.
- Use simple, natural language, not technical jargon. Explain technical errors in a short actionable sentence.

## Home screen information architecture

Keep one compact home screen with:
1. Header: E-ZERO identity, profile/avatar, language switch.
2. Friend search.
3. Friends list with clear selected-friend state and online/availability indicator only when supported by actual presence evidence.
4. One selected-friend action row: Audio call, Video call, Message.
5. Voice note entry within the conversation composer, not as a competing duplicate call action.
6. Add friend / My permanent QR / Scan friend's QR in one simple, clearly separated first-time pairing area.
7. Settings, help and privacy in a secondary menu.

Do not show multiple duplicate audio/video/QR buttons, temporary call QR as personal identity, technical SDP/network panels, or large instructional walls on the main screen. Keep incoming-call UI and active call controls visible even while navigating.

## Audio call experience

- One tap on Audio call for a saved friend initiates an audio-only call using the saved verified friend identity.
- Incoming screen offers Accept and Decline; microphone is not enabled before user consent.
- Show calling, ringing, connecting, connected, reconnecting, failed, and ended states accurately.
- In-call controls: mute/unmute, speaker route if supported, end call. No confusing duplicate controls.
- A call is complete only after both sides have an authenticated session and expected remote audio track; show explicit failure otherwise.
- Never claim connected based only on signaling or a local track.

## Video call experience

- One tap on Video call starts a video-mode call. Explicitly request camera and microphone permissions as required.
- Keep video mode distinct from audio mode end-to-end; do not silently downgrade a video request to audio.
- Show local and remote video states and confirm both tracks before reporting full video success.
- If camera permission/device/track negotiation fails, show a translated error and offer the user an explicit choice to retry video or start audio instead.
- In-call controls: mute, camera on/off, switch camera where supported, end call.
- Preserve the existing WebRTC engine unless a demonstrated defect requires a narrow, tested change.

## Voice messages

- Familiar message composer with a microphone/record button, clear recording timer, Stop, Preview/Play, Send and Discard.
- Recording is explicit and visible; never record in the background. If recording while in a call would require recapturing a muted microphone or changing the call's audio route, stop and explain rather than bypass mute.
- Send only after explicit Send action and authenticated peer DataChannel availability.
- Receiver sees sender, duration, and a Play button; playback begins only after the recipient taps it.
- Provide delivery status only when protocol evidence supports it; do not confuse “sent to channel” with “delivered” or “heard”.
- Set safe, documented duration and payload limits; do not silently truncate. Show a clear limit before recording.
- Voice notes must not be mistaken for live audio calls.

## Design and accessibility

- Mobile-first layout, single-column on narrow screens, generous touch targets, readable contrast and scalable text.
- Use concise labels plus familiar icons; never rely on color or icon alone.
- Keyboard/focus visibility, screen-reader names, live status announcements, reduced-motion support.
- Avoid decorative animation, popups, ads, tracking and unnecessary onboarding steps.
- Show one primary action per context. Hide advanced diagnostics behind Settings / Help.
- Preserve back navigation consistently.

## Required automated UI and localization tests

1. Switch through Urdu, Arabic, English on every major screen; assert all visible controls and status/error strings are translated.
2. Assert `document.documentElement.lang` and `dir` are correct (`ur/ar=rtl`, `en=ltr`) and no clipped/overlapping controls on mobile viewport.
3. Reload after choosing each language; selected language persists.
4. Main home contains one clear action per feature; no duplicate audio/video/voice-note/QR controls.
5. Saved friend selection exposes direct audio, video, and message actions without QR.
6. Incoming call screen remains accessible while active call controls are shown.
7. Voice-note recording, preview, send, receive and manual playback controls are translated in all three languages.
8. Video-mode failure never becomes a successful audio call; fallback requires an explicit user choice.
9. Screen reader labels, keyboard focus, reduced motion, and minimum touch target checks.
10. Test at 320px, 360px, 390px, and tablet widths; test long Arabic and Urdu strings.
11. Existing audio/video/voice-note transport and security tests must continue to pass after UI changes.

## Release boundary

This specification is not evidence that the UI is implemented or that media calls work. Implement only on the isolated staging branch. Keep the previously working WebRTC path intact, add tests before broad refactoring, run browser synthetic-media tests and staging checks, then request one consolidated physical-phone test. Do not deploy to production until separately authorized and all release/legal gates pass.
