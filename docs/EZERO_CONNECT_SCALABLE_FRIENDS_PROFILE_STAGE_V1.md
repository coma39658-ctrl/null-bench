# E-ZERO Connect — Scalable Friends and Profile Stage

Status: STAGING DESIGN BASELINE  
Base: `ezero-connect-qr-runtime-clean-integration-20261121`  
Branch: `ezero-connect-scalable-friends-profile-staging-20261121`

## Accepted product behavior

- Do not impose a fixed friend-count limit such as 500 or 20,400.
- Friend capacity is storage- and device-performance-bound, not a product quota. Never promise unlimited capacity.
- Preserve every trusted contact until the user explicitly removes, revokes, or blocks it. Adding a friend must never evict an older friend.
- Provide fast name/fingerprint search and a paged or virtualized list so a large contact book does not render thousands of DOM rows at once.
- Keep each contact's stable relationship ID and device fingerprint as the association key. A display name or picture is not an identity credential.
- Own profile: editable display name and optional avatar; local by default; sharing requires explicit opt-in.
- Friend profile: display name and optional avatar are shown only after a verified peer association and only when received through the authenticated encrypted peer channel. Clearly label it as peer-supplied, not real-world identity proof.
- Use initials when no avatar is available.
- Preserve the existing QR, mutual approval, encrypted-at-rest contact vault, and call/signaling baseline. Do not change production or the working call path in this stage.

## Scale architecture requirements

1. Keep IndexedDB as the durable local contact store; retain AES-GCM encryption at rest and a non-extractable device-held vault key.
2. Replace eager full-list rendering with bounded pages (initial target 40 visible contacts) and incremental loading/virtualization.
3. Add a normalized search path that does not expose plaintext contact names in an unencrypted index. Measure the decrypt/search cost on representative Android devices.
4. Use stable cursor/relationship identifiers for pagination; never use visible row position as identity.
5. Make contact writes additive and transactional. No automatic eviction or silent truncation.
6. Profile image payloads must be resized/compressed on-device, size-limited, and encrypted with the contact record before persistence. Do not upload profile images to the signaling service.
7. Backup/export and restore are a separate explicit user-consent workflow. Never silently sync private keys or profile data to a server.

## Required validation gates

- Existing trust, pairing, QR, saved-friend selection, and clean-build tests remain green.
- Add tests for 500+ generated contacts and larger synthetic datasets; verify no fixed quota, no automatic deletion, stable pagination, search correctness, and bounded DOM row count.
- Verify profile ownership association by fingerprint and relationship ID; reject profile payloads from unverified peers.
- Verify avatar compression, invalid/oversized image rejection, local encrypted persistence, and opt-in-only peer sharing.
- Verify storage quota/error handling: fail closed with a clear message and preserve previously saved contacts.
- Android browser performance and persistence tests are required before calling this stage production-ready.

## Release rule

This is a staging-only design baseline. No public release, production replacement, or claim of completed profile/list functionality until implementation and all required tests pass.