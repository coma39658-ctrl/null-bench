# E-ZERO Connect — Profile and Friend Scale Stage

Status: IN PROGRESS — isolated staging only. This document is a delivery contract, not a claim that the features or tests have passed.

Base: `ezero-connect-qr-runtime-clean-integration-20261121` at `395a7e2b5c84d7eec06a7529ebb322cb920d6f43`.

## Scope

1. Add an editable local owner profile: display name, optional avatar selected by an explicit gallery action, preview, save, replace, and remove.
2. Show the owner's avatar and display name in the top profile area on every app open.
3. Show a friend's display name and avatar at the top only after the existing cryptographic peer-identity and secure-channel checks succeed. A user-supplied name/photo is profile data, not proof of real-world identity.
4. Persist trusted contacts and profile metadata locally, encrypted at rest using the existing non-extractable IndexedDB vault key. Do not store unverified profile data as a trusted contact.
5. Preserve all existing trusted contacts when adding a new one. No silent eviction, truncation, or automatic deletion.
6. Design the list for a target capacity of 20,400 contacts, with at least 500 as the initial verified capacity. Use indexed lookup/search and paginated or virtualized rendering; never render all 20,400 rows at once.
7. Keep selection, profile, and friend metadata bound to the stable relationship ID and remote key fingerprint, not display name.
8. Do not alter QR expiry/signature/replay rules, mutual-approval requirements, signaling protocol, call mode, or production services.

## Privacy and safety constraints

- No camera, microphone, or gallery access on page load.
- Photo selection is an explicit user action; resize/compress locally; no photo server upload.
- Profile sharing is opt-in and only over an authenticated, encrypted peer connection.
- Do not label a profile as verified identity. Show that the name/photo were supplied by the peer.
- Revoke/block must hide the peer profile from trusted UI and prevent reconnect.
- Storage quota or corruption must fail visibly without deleting existing contacts.

## Required automated tests

- Owner profile create/edit/remove and persistence across reload.
- Avatar type/size validation and local-only storage.
- No file picker or media permission before explicit action.
- Peer avatar accepted only when its fingerprint matches the authenticated peer and the secure data channel is connected.
- Tampered, malformed, oversized, wrong-peer, and untrusted avatar payloads rejected.
- Friend list retains 500 and 20,400 generated trusted-contact fixtures without silent deletion.
- Search correctness at 500 and 20,400; pagination/virtualization renders a bounded number of DOM rows.
- Add-contact operation never overwrites an existing relationship; duplicate, revoked, and blocked states handled explicitly.
- Reload persistence and storage failure behavior.
- Existing clean-build, QR runtime, mutual trust, saved-friend selection, and signaling regression suites remain green.

## Exit gate

The stage is not PASS until CI reports all relevant tests green. Then run a two-device Android staging check for owner profile, peer avatar after verified connection, list persistence, and no-QR reconnect. Do not deploy to production from this branch.