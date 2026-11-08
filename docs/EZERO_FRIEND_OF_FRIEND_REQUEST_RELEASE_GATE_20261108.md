# E-ZERO friend-of-friend contact requests — implementation gate v0.1

**State: STAGING DESIGN ONLY.** The owner-signed contact card in PR #128 can be forwarded, but it does not establish an authenticated friendship or route an incoming request. No production deployment or phone-number discovery is authorized.

## Intended user journey

1. Ali opens E-ZERO, saves a profile and explicitly selects **Allow forwarding my contact**. The browser signs a short-lived contact card with Ali's persistent device key.
2. Ahmad, who already has Ali's signed card, forwards the **same signed card** to Sara through E-ZERO or a third-party app. Ahmad must not be able to change Ali's name, fingerprint, expiry or consent without invalidating the signature.
3. Sara opens the link on the **same trusted HTTPS origin**. She sees the device-signed name, truncated fingerprint, expiry, and a clear notice that the card is **not verified human identity**. It must not be auto-saved as a trusted friend.
4. Sara can choose **Request contact**. A request is signed by Sara's own persistent device key and routed to Ali's inbox using an independent server-side consent/abuse protocol. No raw phone number, private key, call room token or media content is sent.
5. Ali receives an explicit request from a previously unknown person, with the **claimed** name, verified device fingerprint, and source marked “forwarded contact” (not “trusted friend”). Ali may **Accept / Reject / Block**. Default: no permission, no media, no automatic calls.
6. After Ali accepts, Sara receives an acknowledgement. A second, mutual verification/acceptance step should be used before adding each other to Trusted Friends. Only then may the existing trusted-call flow be used; existing WebRTC code must remain unchanged.

## Separate protocols, separate privileges

| Data | Scope | Allowed operation |
| --- | --- | --- |
| Owner-signed contact card | 24h, consented, forwardable | Verify public owner device identity; display only |
| Stranger request | One-time, signed, rate-limited, short TTL | Ask the owner to review; no call |
| Owner acceptance | One-time, signed, exact sender/owner pair | Permit mutual friend confirmation |
| Trusted friend | Existing locally verified roster plus server allowlist | Use existing owner-approved call invitation |
| One-time call QR | Separate, expiring WebRTC room | Never embed in a forwarded public contact |

**Existing server limitation:** `signaling/cloudflare/src/trusted_inbox_candidate_v0_1.js` currently rejects callers not already on the owner's trusted allowlist. Never weaken this gate to make strangers' calls work. Add a **different route**, storage namespace and message type for stranger contact requests.

## Minimum server-side requirements

- Derive the owner's inbox route from the signed owner public key fingerprint. Verify the owner's signature and short expiry, and verify sender's own key/signature, fresh challenge and exact origin.
- Contact cards are bearer-distributed public identity disclosures; **any person holding a card may ask once, but no one may automatically connect**. Add owner-controlled disable/revoke for the public inbox and cards, not just 24h expiration.
- Validate full canonical bytes, purpose, nonce, sender/owner pair, issue/expiry times, replay and strict request size. Disallow query-string bearer secrets, redirect destinations, executable URLs and arbitrary domains.
- Apply edge/IP/device/account quotas, per-owner inbox caps, global quotas, cooldowns, maximum concurrent sockets, explicit expiry, and blocklist checks. Reject floods before durable storage, not only inside a per-owner Durable Object.
- Protect against contact enumeration: never expose whether an owner account exists, is online, has blocked the requester or accepted a request to unauthenticated callers.
- Default to **foreground-only** inbox unless separate user-consented push delivery is implemented. Do not imply offline notifications or immediate delivery without verified evidence.
- Owner must be able to block and revoke sender identity. Maintain only minimal encrypted/expiring request metadata, with a disclosed retention policy and no private conversation payloads.
- E2EE claims must be scoped to the existing verified WebRTC media path. The contact-request envelope is not a secret chat or call.
- No paid TURN, Cloudflare or Render upgrade, account scope change or production publish without separate authorization and demonstrated costs.

## Required CI and physical release gates

1. Valid owner consent, signature, sender signature, exact origin and expiration.
2. Altered owner name/fingerprint, forged sender, replay, stale nonce, wrong domain and wrong protocol rejected.
3. Blocked/disabled/revoked owner cards cannot initiate requests; owner can reject/block; no auto-trust.
4. Flood and enumeration simulations, bounded memory/storage and global quota behavior.
5. No regression of existing signed call QR, two-browser WebRTC audio/video, voice notes, chat and QR scanning.
6. Real two-phone test: A signs card, B forwards, C opens, requests, A accepts, C sees response, both mutually save, then test a **new** real audio/video call. Also test reject/block/offline/no-server states.
7. Verify current staging build SHA on **both phones**; no mixed versions or stale cached assets. Keep production unchanged until all gates pass.

**Release state:** CONTACT_CARD_SIGNED_AND_CI_TESTED; CONTACT_REQUEST_ROUTING_NOT_IMPLEMENTED; THIRD_PARTY_END_TO_END_NOT_VERIFIED.
