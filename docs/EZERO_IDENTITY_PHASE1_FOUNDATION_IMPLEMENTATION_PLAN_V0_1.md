# E-ZERO Identity Phase 1 Foundation Implementation Plan V0.1

Status: PREREGISTERED IMPLEMENTATION PLAN
Version: 0.1

Base Architecture:
- EZERO_IDENTITY_ACCOUNTS_MESSAGING_ARCHITECTURE_V0_1
- Commit: adfc139767fcaa044db97dd0a6bbad60b0969817

Base Review Resolution:
- EZERO_IDENTITY_ARCHITECTURE_REVIEW_RESOLUTION_V0_1
- Commit: 7d9a2c86dd4bede40f221cb44c7a160916f61455

Implementation Status: NOT STARTED
Public Activation: NOT AUTHORIZED

## 1. Purpose

This document defines the minimum safe implementation plan for the first
E-ZERO Identity and Account foundation.

The objective is not to build the complete future ecosystem.

The objective is to establish a small, secure, testable foundation that later
modules can use without rewriting authentication, authorization, privacy,
audit, messaging or organization boundaries.

## 2. Phase 1 Scope

Phase 1 includes only:

- verified email identity
- secure authentication foundation
- secure session handling
- logout and session revocation
- account recovery foundation
- minimal user profile
- small role/authorization core
- organization membership foundation
- tenant isolation
- shared audit envelope
- data classification
- PII protection/redaction
- rate-limit and abuse-control foundation
- feature-state registry
- notification preference foundation
- governed messaging-core contract
- entitlement interface only
- secure administrative boundaries
- test and staging infrastructure

## 3. Explicit Non-Goals

Phase 1 will NOT implement:

- Professional Network
- social feed
- marketplace
- broker workflows
- escrow
- payment custody
- KYC/AML for ordinary accounts
- workshop workflow
- Visual Assistant
- advanced fleet workflow
- direct vehicle control
- ECU write functions
- DTC clearing
- actuator control
- AI autonomous actions
- AI permission changes
- live self-training
- large role matrices
- heavy external policy engines without demonstrated need

## 4. Repository Separation

Decision: REQUIRED

The production Identity backend must not be embedded into the Null Bench
scientific/public frontend code.

Recommended separation:

- null_bench_public
  Public UI, documentation and versioned client integration contracts only.

- E-ZERO Identity Service
  Separate backend service/repository for authentication, accounts,
  authorization, sessions and privacy-sensitive identity logic.

- E-ZERO Messaging Service or Messaging Core
  Separate governed communication layer when implementation requires it.

Shared interfaces must be versioned.

No backend secret may be committed to a public repository.

## 5. Backend Technology Decision Gate

No authentication vendor or backend stack is frozen by this document.

Before implementation, create a small Architecture Decision Record comparing:

- managed authentication provider
- existing E-ZERO cloud infrastructure
- minimal first-party identity service

Selection criteria:

- security
- email verification support
- session security
- account recovery
- MFA/passkey future support
- cost
- maintainability
- portability
- privacy controls
- auditability
- API quality
- regional suitability
- lock-in risk

Do not build custom cryptography.

## 6. Initial Authentication Method

Preferred initial capability:

- verified email ownership
- passwordless one-time code or magic-link authentication

Only one primary authentication flow needs to be implemented initially.

Additional password, passkey or MFA methods remain future extensions unless
the selected provider makes them safe and low-complexity.

## 7. Email Verification Requirements

Verification must use:

- unpredictable server-generated token/code
- short expiration
- one-time use
- server-side verification
- rate limiting
- replay protection
- generic responses that resist account enumeration
- audit event
- expired-token state
- invalid-token state

Verification must not rely on frontend state.

## 8. Session Requirements

Sessions must support:

- secure creation
- expiration
- explicit logout
- revocation
- device/session identification where practical
- server-side validation
- session rotation where required
- account suspension invalidation
- security-event logging

Browser session cookies, if used, must be:

- Secure
- HttpOnly
- appropriately SameSite protected

Authentication secrets must never be stored in public frontend JavaScript.

## 9. Account Recovery

Recovery must support:

- verified recovery channel
- expiring single-use recovery token
- rate limiting
- anti-enumeration response
- session revocation after sensitive recovery where appropriate
- audit event
- security notification

Recovery must not disclose whether an arbitrary email exists in the system.

## 10. Minimal User Record

Initial user account data should be intentionally small.

Suggested logical fields:

- user_id
- identity_provider_reference
- email_verification_state
- encrypted/protected email reference where required
- display_name
- preferred_language
- region/country preference
- timezone
- account_status
- created_at
- updated_at
- privacy_notice_version
- consent references

Avoid collecting unnecessary personal information.

## 11. Initial Role Model

Use a small RBAC foundation.

Initial role families:

- USER
- PROFESSIONAL
- ORGANIZATION_MANAGER
- ADMINISTRATOR

READ_ONLY behavior should preferably be a permission/scope where practical,
not automatically a separate global role.

Future domain identities such as:

- driver
- technician
- workshop member
- vehicle owner
- fleet member

should initially be represented through scoped memberships or attributes.

Do not create all future roles during Phase 1.

## 12. Authorization Principle

Every sensitive action must be authorized server-side.

Authorization decision inputs may include:

- authenticated user
- role
- organization membership
- object ownership
- resource scope
- entitlement state
- feature state
- safety policy

Frontend visibility is not authorization.

AI output is not authorization.

Premium status is not authorization.

## 13. Organization and Tenant Model

Phase 1 must reserve a minimal organization model.

Logical entities:

- organization
- organization_membership
- membership_role
- membership_status

A single user may belong to multiple organizations.

Permissions must be evaluated in the current organization context.

No organization may query another organization's private objects.

## 14. Tenant Isolation

Tenant isolation requires:

- organization-scoped queries
- server-side tenant validation
- object ownership checks
- cross-tenant negative tests
- audit logging

Where the selected database supports secure row-level security or equivalent
database-level isolation, it should be evaluated for sensitive multi-tenant data.

Application UI checks alone are insufficient.

## 15. Data Classification

Every persisted or transmitted field must have a classification.

Initial classes:

PUBLIC
INTERNAL
PII
SENSITIVE_ACCOUNT
SECURITY_SENSITIVE
EVIDENCE
REGULATED

Classification must affect:

- storage
- encryption
- logging
- retention
- analytics
- AI access
- exports
- deletion
- sharing

## 16. PII Boundary

Personally identifiable information must remain private by default.

Raw email addresses must not be sent by default to:

- AI Agent
- public analytics
- evidence bundles
- public logs
- unrelated modules

A shared redaction/sanitization layer should remove or mask protected values
before they cross those boundaries.

## 17. Logging Rules

Never log:

- passwords
- session secrets
- authentication tokens
- magic-link tokens
- recovery tokens
- API secrets
- payment credentials
- unnecessary raw email addresses

Log references or redacted identifiers instead.

## 18. Shared Audit Envelope

Sensitive events use a common audit envelope.

Required fields:

- event_id
- timestamp
- actor_id or system_actor
- module
- action
- target_reference
- result
- correlation_id
- schema_version

Optional module-specific metadata must remain bounded and classified.

## 19. Initial Audit Events

Phase 1 should audit:

- account created
- email verified
- authentication success
- authentication failure category
- logout
- session revoked
- recovery requested
- recovery completed
- role changed
- organization membership changed
- account suspended/reactivated
- consent changed
- notification preference changed
- entitlement reference changed
- administrative action
- broadcast approval/send event when later enabled

## 20. Rate Limiting

A common rate-limit policy must cover:

- signup
- verification resend
- login
- one-time code attempts
- magic-link generation
- recovery
- AI requests
- messaging
- media upload in future
- administrative endpoints

Limits may vary by endpoint but infrastructure and policy must remain governed.

## 21. Abuse Controls

Phase 1 must support:

- repeated-attempt detection
- bot/automation mitigation where justified
- IP/device/user-level controls where appropriate
- temporary throttling
- suspicious activity audit
- account review/suspension hooks

Controls must avoid leaking account existence.

## 22. Feature-State Registry

Implement one authoritative feature-state source.

Minimum lifecycle values:

- DISABLED
- COMING_SOON
- PREVIEW
- SIMULATED
- VALIDATED
- AVAILABLE
- REAL_WORLD

REAL_WORLD must only be used where independently justified.

Feature state must not imply evidence strength.

## 23. Feature-State Consumers

Where practical, the same authoritative source should inform:

- public UI
- authenticated UI
- AI Agent
- administrative interface
- API capability checks

Frontend hard-coded status must not override authoritative state.

## 24. Entitlement Interface

Phase 1 defines an entitlement interface but does not implement full billing.

Logical entitlement data may include:

- subject_user_id
- organization_id if applicable
- plan_code
- capability_code
- state
- valid_from
- valid_until
- source
- version

Identity consumes entitlement state.

Identity does not process payment cards.

## 25. Entitlement Safety Boundary

Entitlement never bypasses:

- authorization
- safety rules
- evidence rules
- legal requirements
- high-risk repair gates
- vehicle read-only boundaries

PREMIUM does not mean ADMIN.

## 26. Notification Preferences

Phase 1 may store preferences for:

- security/account messages
- product/system updates
- service reminders
- optional marketing
- preferred language

Security-critical messages remain separate from optional marketing consent.

## 27. Messaging Core Contract

Phase 1 defines one governed messaging contract.

Minimum message metadata:

- message_id
- message_type
- sender_context
- recipient_context
- created_at
- channel
- priority
- delivery_state
- read_state where applicable
- acknowledgement_state where applicable
- audit_reference
- schema_version

Different products use different policy contexts but not incompatible
delivery-state engines.

## 28. Messaging Context Separation

Supported future contexts may include:

- ACCOUNT_SECURITY
- SYSTEM_UPDATE
- ADMIN_BROADCAST
- FLEET_DISPATCH
- PROFESSIONAL_DIRECT_MESSAGE
- WORKSHOP_MESSAGE

Context does not erase existing module-specific governance.

Stage C Voice Note remains human-to-human.

Voice Guide / TTS remains separate.

## 29. Administrative Boundary

Administrative capabilities must require:

- authenticated administrator
- server-side authorization
- stronger authentication where justified
- explicit target scope
- confirmation for high-impact actions
- audit trail

No hidden administrator capability may be exposed through frontend parameters.

## 30. Broadcast Safety

Mass communication must eventually require:

- permitted administrator
- recipient segment definition
- estimated recipient count
- message preview
- confirmation gate
- consent filtering where required
- audit event
- delivery result summary

AI must not independently trigger mass sending.

## 31. AI Capability Boundary

The AI Agent may receive minimal account context such as:

- authenticated true/false
- role family
- organization context reference
- entitlement capability
- preferred language
- permitted feature state

It should not receive raw PII unless a separately authorized workflow requires it.

## 32. AI Server-Side Capability Gate

Any AI-requested external action must pass an independent server-side gate.

The AI must not independently:

- change roles
- change account security
- change entitlements
- send unrestricted broadcasts
- access unrelated private accounts
- release payments
- modify scientific evidence
- control vehicle systems
- control machinery

Existing invariants remain:

DIAGNOSTIC_CLAIM = FALSE
EVIDENCE_AUTHORITY = FALSE

## 33. Evidence Separation

Identity information is not scientific evidence.

Authentication success is not scientific evidence.

Premium status is not scientific evidence.

Messaging content is not scientific evidence.

Identity implementation must not edit:

- Evidence Registry
- raw sensor evidence
- validated scientific outputs
- frozen research claims

## 34. Vehicle Separation

Identity or premium status must never automatically authorize:

- ECU write
- DTC clearing
- firmware flashing
- coding
- programming
- actuator operation
- sensor modification
- vehicle safety-system modification

Vehicle governance remains independent.

## 35. Secrets Management

Secrets must be supplied through secure deployment configuration.

Never commit:

- API keys
- signing secrets
- SMTP/provider credentials
- database passwords
- private encryption keys
- auth-provider secrets

Development/test secrets must also remain outside public Git history.

## 36. Email Provider Boundary

Email delivery must use a separate provider adapter.

Provider responsibilities may include:

- transactional delivery
- bounce events
- complaint events
- delivery status

E-ZERO must preserve its own consent, authorization and audit rules.

Provider choice must not become the identity architecture itself.

## 37. Email Deliverability

Before production email activation, validate:

- sender-domain ownership
- SPF
- DKIM
- DMARC strategy
- bounce handling
- complaint handling
- unsubscribe behavior for optional marketing
- transactional/marketing separation

## 38. API Principles

Identity APIs must:

- be versioned
- use HTTPS
- validate request schemas
- validate response schemas
- authorize server-side
- use bounded input sizes
- use deterministic error categories
- avoid internal stack leakage
- apply rate limits
- produce audit events where required

## 39. API Error Classes

Define stable error classes rather than leaking implementation details.

Examples:

- INVALID_REQUEST
- AUTHENTICATION_REQUIRED
- AUTHENTICATION_FAILED
- VERIFICATION_REQUIRED
- TOKEN_EXPIRED
- RATE_LIMITED
- NOT_AUTHORIZED
- RESOURCE_NOT_FOUND
- TENANT_SCOPE_VIOLATION
- FEATURE_DISABLED
- TEMPORARILY_UNAVAILABLE

External errors should not reveal sensitive account existence unnecessarily.

## 40. Database Migration Discipline

Database changes must be:

- versioned
- reviewable
- tested
- backward-aware
- reversible where practical
- backed up before destructive migration
- independently verified before production

No destructive migration should be bundled with unrelated feature work.

## 41. Minimum Security Tests

Before any public activation:

- signup validation
- email verification success
- invalid verification
- expired verification
- replayed verification
- verification rate limit
- login success
- login failure
- account enumeration resistance
- session expiry
- logout
- session revocation
- recovery success
- recovery replay rejection
- unauthorized endpoint access
- role enforcement
- ownership enforcement
- cross-user isolation
- cross-company isolation
- admin-only operation rejection
- entitlement cannot bypass authorization
- feature-disabled rejection
- AI capability-gate rejection
- PII redaction
- audit generation
- secret leakage check

## 42. Privacy Tests

Required tests include:

- email not exposed publicly
- email not sent to AI by default
- email not present in public analytics
- authentication tokens absent from logs
- recovery tokens absent from logs
- consent preference respected
- optional marketing opt-out respected
- cross-account data access rejected
- data export authorization
- deletion workflow authorization when implemented

## 43. Tenant Tests

Required negative tests:

- User A cannot read User B private account data.
- Organization A cannot read Organization B private objects.
- Organization manager cannot administer another organization.
- A changed frontend organization identifier must not bypass server checks.
- Deleted/revoked membership must lose access.

## 44. Rate-Limit Tests

Test:

- repeated login
- repeated verification resend
- invalid code attempts
- recovery abuse
- messaging abuse
- administrative endpoint abuse

Rate limits must return controlled responses without leaking sensitive state.

## 45. Audit Tests

Verify:

- unique event_id
- timestamp presence
- actor reference
- target reference
- correlation_id
- result
- schema version
- no secret leakage
- cross-module traceability

## 46. Failure Behavior

Identity outage must not corrupt unrelated modules.

Where safely possible:

- static Null Bench remains accessible
- public research content remains accessible
- Evidence Registry remains unchanged
- AI failure remains isolated
- messaging failure does not alter permissions
- billing failure does not alter scientific evidence

Sensitive account actions fail closed.

## 47. Staging Requirement

No identity code goes directly to public production.

A staging environment must support:

- non-production database
- non-production email destination/configuration
- test users
- test organizations
- rate-limit testing
- security testing
- audit inspection
- rollback validation

## 48. Public Activation Gate

Public activation requires documented PASS for:

- authentication tests
- authorization tests
- tenant isolation
- privacy tests
- PII redaction
- rate limiting
- audit tests
- feature-state checks
- failure-mode tests
- secret scanning
- staging validation
- rollback readiness

## 49. Proposed Implementation Sequence

Step 1:
Freeze this implementation plan.

Step 2:
Create technology-selection / ADR document.

Step 3:
Create separate Identity backend repository/service.

Step 4:
Define schemas and API contracts.

Step 5:
Implement audit/data-classification/privacy foundations.

Step 6:
Implement minimal email authentication.

Step 7:
Implement sessions and recovery.

Step 8:
Implement minimal RBAC and organization membership.

Step 9:
Implement tenant-isolation controls.

Step 10:
Implement rate limiting and abuse controls.

Step 11:
Implement feature-state registry integration.

Step 12:
Implement notification preferences and governed messaging contract.

Step 13:
Implement entitlement interface only.

Step 14:
Run complete automated test suite.

Step 15:
Run staging/security/privacy validation.

Step 16:
User-facing review.

Step 17:
Controlled public activation only after explicit approval.

## 50. Rollback Principle

Every public activation must have:

- known previous stable version
- deployment identifier
- database migration state
- rollback instructions
- configuration rollback
- audit record

Rollback must not silently destroy user data.

## 51. No Premature Expansion

Phase 1 must not expand merely because future interfaces exist.

Future modules remain dormant until separately justified.

The implementation team must reject unrelated feature additions during the
foundation phase.

## 52. Success Criteria

Phase 1 is successful when:

- users can authenticate securely
- email ownership can be verified
- sessions can be revoked
- authorization is server-side
- role model remains small
- organizations are isolated
- PII is protected
- audit is correlated
- rate limiting is consistent
- feature state is authoritative
- messaging has one governed contract
- entitlement remains separate
- AI has no hidden authority
- vehicle/evidence boundaries remain unchanged
- future modules can integrate through explicit interfaces

## 53. Current Boundary

This document is an implementation plan only.

It does NOT:

- create accounts
- collect public-user emails
- deploy authentication
- create a production database
- configure a production email provider
- send messages
- activate premium plans
- activate billing
- activate Professional Network
- activate Workshop
- activate Visual Assistant
- activate Marketplace
- activate Escrow
- alter AI authority
- alter vehicle authority
- alter scientific evidence

Implementation requires a separately created implementation branch/service
after this plan is reviewed and frozen.
