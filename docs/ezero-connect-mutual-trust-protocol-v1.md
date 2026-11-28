# E-ZERO Connect — Mutual Trust Protocol v1

Status: design contract for Stage 4. Not yet implemented or security-certified.

## Purpose

A valid QR proves only that the invite was signed by the device key named in the QR. It does not prove a real-world name, establish friendship, or authorize calls. A saved contact is created only after both devices sign the same relationship transcript and each local user explicitly approves saving.

## Canonical relationship transcript

Both sides construct the same canonical object:

- `v: 1`
- `protocol: "E-ZERO-TRUST-1"`
- `purpose: "mutual-contact-save"`
- `participants`: exactly two entries, sorted lexicographically by fingerprint; each entry contains the fingerprint and public SPKI key.
- `roomId`: the one-time invite room ID.
- `inviteNonce`: the verified one-time QR nonce.
- `inviteIssuedAt` and `inviteExpiresAt`: copied from the verified signed invite.
- `createdAt`: a single timestamp supplied by the inviter and echoed unchanged by the responder.

The transcript hash is SHA-256 over the canonical UTF-8 representation. Names and profile photos are deliberately excluded from the identity transcript; they are display metadata only.

## Two-sided approval

1. The invitee scans and cryptographically verifies the QR; the UI displays the inviter fingerprint and an explicit Accept / Decline decision.
2. If the invitee taps Accept, the invitee signs the transcript with their non-extractable device key and sends the transcript plus signature.
3. The inviter verifies the responder fingerprint, public-key hash, transcript hash and signature. The inviter then sees a separate explicit approval screen.
4. Only if the inviter taps Accept does the inviter sign the exact same transcript.
5. Both sides verify the other side's signature and show the same relationship ID.
6. Each side saves the other device locally only after its own explicit Save confirmation and verification of both signatures.

A scan, a received signature, a display name, a matching avatar or a successful WebRTC handshake is not consent.

## Local trusted-contact record

Store in IndexedDB:
- remote public SPKI key and fingerprint;
- local relationship ID and canonical transcript hash;
- both signed approvals;
- optional display name and avatar reference, stored as metadata;
- created and revoked timestamps;
- status `TRUSTED`, `REVOKED` or `BLOCKED`.

Do not store invite guest secrets after the short-lived room session is closed. Do not store a private key in the contact record. The device private key remains in the separate identity store.

## Reconnect policy

- No-QR direct reconnect is permitted only when the saved record is `TRUSTED`, the remote fingerprint matches the saved public key, and neither side has locally revoked the relationship.
- A key mismatch, revoked record, blocked fingerprint, expired room or invalid signature fails closed.
- A fresh QR can establish a new relationship after an explicit new approval; it must not silently restore an old relationship.
- Do not fabricate online, offline, missed-call or delivered status.

## Revocation and blocking

- Remove friend: mark the local relationship revoked and disable direct reconnect.
- Block: mark blocked, suppress incoming relationship requests from that fingerprint and disable calls.
- Unblock is a separate explicit action; it does not automatically recreate trust.
- A new QR after revocation creates a new relationship ID and requires both sides to approve again.

## Tests required

- Two separate browser profiles create different device keys.
- QR scan alone does not save a contact.
- Invitee decline creates no trusted record.
- Invitee accepts but inviter declines: neither side becomes trusted.
- Both accept and both save: same transcript hash and relationship ID on both sides.
- Public-key/fingerprint mismatch, modified transcript, modified signature and replay all fail closed.
- Revocation blocks no-QR reconnect; a fresh QR requires new two-sided approval.
- Existing contacts remain unchanged when another contact is added or removed.

No Stage 4 code should be merged until these contracts have automated two-profile tests and then physical Android-to-Android verification.
