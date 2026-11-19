# E-ZERO Connect — Identity and Signaling Contract v1

Status: design contract for clean implementation; not a security certification.

## 1. Device identity

- Generate a device-scoped ECDSA P-256 signing key with WebCrypto.
- Persist the private CryptoKey in IndexedDB only after explicit user consent; use non-extractable private keys.
- Export only the public SPKI key. Derive the displayed fingerprint as SHA-256(SPKI).
- A fingerprint identifies a device key, not a real-world person.
- A device key may be revoked locally. A revoked or mismatched key must fail closed; do not silently fall back to QR or another identity.
- Recovery from lost browser storage requires a fresh mutual approval; do not silently restore trust from a display name or avatar.

## 2. First-contact QR

The QR carries a versioned, short-lived invite envelope:
- protocol version and exact allowed origin;
- inviter public key and fingerprint;
- cryptographically random one-time room identifier;
- creation and expiry timestamps (maximum lifetime 90 seconds for the QR invitation);
- signed canonical payload.

The receiving device verifies the signature, origin, fingerprint, expiry, and replay status before presenting the approval screen. The QR is single-use. The invite contains no unused bearer secret; the live signaling handshake is separately signed by each device key. A QR scan is not consent and must never auto-answer a call.

## 3. Mutual trust

- Both devices explicitly approve the contact relationship.
- Each side signs the same canonical relationship transcript containing both fingerprints, protocol version, and creation time.
- Persist the remote public key, fingerprint, display name, and consent state locally only after the user confirms Save.
- Names and photos are display metadata, never identity proof.
- Saved-friend reconnect is allowed only after signature verification and a still-valid, non-revoked trust record.
- Removing or blocking a friend revokes the local trust record and stops future direct reconnect attempts.

## 4. Signaling service

- Use a dedicated Cloudflare Worker and Durable Object namespace, separate from unrelated E-ZERO services.
- Enforce exact `Origin`, HTTPS/WSS only, strict payload sizes, message allowlist, per-IP/per-room rate limits and room expiry.
- No bearer room secret is placed in the QR. Room access is authenticated with short-lived signed challenges bound to the device public key, role, room ID and invite nonce.
- Forward only offer/answer/ICE/hangup messages; never persist SDP, ICE candidates, chat, audio, video, profile photos or contact lists.
- A room expires after at most 10 minutes. QR invite expiry remains shorter (90 seconds).
- Close duplicate role connections and all sockets on expiry/revocation.
- Never log invite URLs, room secrets, SDP, ICE candidates, message bodies, names or fingerprints.

## 5. Calls and media

- Media permission is requested only after the user taps Audio or Video for a selected verified friend.
- The chosen mode is bound to the call attempt. Video cannot silently become audio.
- Incoming calls require an explicit accept/decline action; never auto-answer.
- Hangup stops local tracks, closes peer/data channels and revokes the room session.
- STUN-only is not a universal connectivity guarantee. TURN is required before claiming reliability across mobile networks/CGNAT.
- No background ringing or powered-off-device notification promise until platform-specific push delivery is implemented and verified.

## 6. Messaging boundary

- The first real-time messaging milestone is text over an authenticated, connected WebRTC data channel.
- Images and voice notes require size/type limits, explicit user action and delivery/error states.
- No offline delivery or persistent cloud message history is claimed in v1.
- Do not claim an independently audited E2EE messaging protocol unless a maintained, reviewed protocol implementation is adopted and verified.

## 7. Required tests before staging

- Invalid signature, wrong origin, expired invite, replayed invite, wrong fingerprint, malformed QR.
- Both sides approve; one side declines; one side revokes; storage unavailable; key mismatch.
- Room role secret mismatch, duplicate role, rate limit, oversized payload, invalid message type, room expiry.
- No media permission before explicit click; audio remains audio; video remains video; hangup stops tracks.
- Real Android devices on same Wi-Fi and separate networks, with TURN where required.

This contract is a build specification, not evidence that any of these services currently work.
