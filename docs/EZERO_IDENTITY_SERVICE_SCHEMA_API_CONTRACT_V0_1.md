# E-ZERO Identity Service Schema & API Contract V0.1

Status: PREREGISTRATION / CONTRACT SPECIFICATION
Version: 0.1

Base Architecture:
EZERO_IDENTITY_ACCOUNTS_MESSAGING_ARCHITECTURE_V0_1

Base Review Resolution:
EZERO_IDENTITY_ARCHITECTURE_REVIEW_RESOLUTION_V0_1

Base Phase-1 Plan:
EZERO_IDENTITY_PHASE1_FOUNDATION_IMPLEMENTATION_PLAN_V0_1

Base Technology ADR:
EZERO_IDENTITY_TECHNOLOGY_SELECTION_ADR_V0_1

Technology ADR Commit:
a8cc0ae77e06eb6ed86b93fbf527131ad6f473af

Implementation Status: NOT STARTED
Database Migration Status: NOT CREATED
Production Activation: NOT AUTHORIZED

## 1. Purpose

This specification defines the minimum versioned data and API contracts for
the E-ZERO Identity Phase 1 foundation.

It does not create database tables or deploy authentication.

The purpose is to freeze interfaces before implementation so that:

- frontend and backend responsibilities remain clear
- Supabase-specific details do not leak into public business logic
- tenant isolation is explicit
- private data remains classified
- AI receives only minimal account context
- future modules can integrate without changing Identity internals
- code and domain responsibilities do not become mixed

## 2. Contract Principles

All Phase 1 contracts must follow:

- minimum necessary data
- server-side authorization
- deny-by-default sensitive access
- tenant-aware resource access
- versioned API contracts
- bounded request size
- deterministic error classes
- stable identifiers
- explicit data classification
- audit references for sensitive changes
- no secrets in public responses
- no scientific-evidence authority
- no vehicle-control authority

## 3. Identifier Standard

Primary resource identifiers should use UUID-compatible identifiers.

Logical identifiers include:

- user_id
- organization_id
- membership_id
- consent_id
- entitlement_id
- feature_id
- audit_event_id
- correlation_id

Identifiers must not encode:

- email addresses
- phone numbers
- passwords
- secrets
- entitlement level
- tenant-sensitive information

## 4. Authentication Provider Boundary

Supabase Auth remains responsible for provider-level identity primitives.

E-ZERO application tables must not duplicate:

- passwords
- password hashes
- refresh tokens
- magic-link secrets
- OTP secrets
- service-role credentials

E-ZERO may reference the authenticated provider user by user_id.

## 5. Logical Schema Domains

Phase 1 logical domains:

- auth provider identity
- user_profile
- organization
- organization_membership
- consent_record
- notification_preference
- entitlement_reference
- feature_state
- audit_event
- security_event reference where required

Future domains remain separate.

## 6. User Profile Contract

Logical entity:

user_profile

Minimum fields:

- user_id
- display_name
- preferred_language
- country_or_region
- timezone
- account_status
- created_at
- updated_at
- profile_schema_version

Data classification:

- user_id: INTERNAL
- display_name: PII
- preferred_language: INTERNAL
- country_or_region: PII / INTERNAL depending on precision
- timezone: INTERNAL
- account_status: SENSITIVE_ACCOUNT
- timestamps: INTERNAL

Raw authentication email should not be duplicated into user_profile unless a
separate reviewed requirement proves duplication necessary.

## 7. Account Status

Allowed initial account states:

- ACTIVE
- SUSPENDED
- CLOSED
- PENDING_REVIEW

Account status must be server-controlled.

Frontend input must never directly set account_status.

## 8. Preferred Language

preferred_language should use a bounded language identifier.

The field supports:

- UI localization
- messaging preference
- AI response-language preference

It does not grant permissions.

## 9. Organization Contract

Logical entity:

organization

Minimum fields:

- organization_id
- legal_or_display_name
- organization_type
- status
- created_at
- updated_at
- schema_version

Initial organization_type values:

- COMPANY
- WORKSHOP
- FLEET
- PROFESSIONAL_ENTITY
- OTHER

Creating an organization type does not activate its future domain module.

## 10. Organization Status

Initial organization states:

- ACTIVE
- SUSPENDED
- CLOSED
- PENDING_REVIEW

Organization state is server-controlled.

## 11. Organization Membership Contract

Logical entity:

organization_membership

Minimum fields:

- membership_id
- organization_id
- user_id
- role_family
- membership_status
- created_at
- updated_at
- schema_version

Required uniqueness:

A user must not have duplicate active membership records for the same
organization and same membership scope unless explicitly supported later.

## 12. Initial Role Families

Allowed Phase 1 role families:

- USER
- PROFESSIONAL
- ORGANIZATION_MANAGER
- ADMINISTRATOR

Do not add all future business-domain roles during Phase 1.

Domain-specific relationships such as:

- driver
- technician
- workshop member
- vehicle owner
- fleet member

must remain scoped attributes or future module relationships.

## 13. Membership Status

Initial membership states:

- INVITED
- ACTIVE
- SUSPENDED
- REVOKED

A revoked or suspended membership must not retain organization access.

## 14. Authorization Inputs

Server-side authorization may consider:

- authenticated user_id
- account_status
- organization_id
- membership_status
- role_family
- object ownership
- feature_state
- entitlement capability
- safety policy
- explicit resource scope

No single field independently grants unrestricted access.

## 15. Tenant Isolation Rule

Every organization-private object must include or resolve to an organization_id.

Tenant-sensitive queries must verify:

- authenticated identity
- organization membership
- membership status
- permission for requested action
- target resource organization

A client-supplied organization_id alone is never sufficient authorization.

## 16. Row-Level Security Expectation

Where Supabase/Postgres RLS is used:

- policies must be explicit
- policies must be version controlled
- policies must be tested
- deny-by-default is preferred for private tables
- cross-tenant negative tests are mandatory

RLS is defense in depth.

Server-side authorization remains mandatory.

## 17. Consent Record Contract

Logical entity:

consent_record

Minimum fields:

- consent_id
- user_id
- consent_type
- policy_version
- state
- recorded_at
- source
- schema_version

Possible consent_type values:

- PRIVACY_NOTICE
- OPTIONAL_MARKETING
- OPTIONAL_PRODUCT_UPDATES
- MEDIA_PROCESSING
- FUTURE_DOMAIN_SPECIFIC

## 18. Consent State

Allowed states:

- GRANTED
- WITHDRAWN
- NOT_REQUIRED

Consent history must be append-aware.

A newer consent change must not silently erase historical auditability.

## 19. Notification Preference Contract

Logical entity:

notification_preference

Minimum fields:

- user_id
- category
- channel
- enabled
- preferred_language
- updated_at
- schema_version

Initial categories:

- SECURITY
- ACCOUNT
- SYSTEM_UPDATE
- SERVICE_REMINDER
- OPTIONAL_MARKETING

Initial channels:

- EMAIL
- IN_APP

Future SMS or push requires separate activation.

## 20. Security Message Rule

Users may not disable essential account/security messages when delivery is
required for account protection.

Marketing preference must remain independent.

## 21. Entitlement Reference Contract

Logical entity:

entitlement_reference

Minimum fields:

- entitlement_id
- subject_type
- subject_id
- capability_code
- plan_code
- state
- valid_from
- valid_until
- source_system
- source_reference
- updated_at
- schema_version

Identity does not process payment credentials.

## 22. Entitlement Subject Types

Initial subject types:

- USER
- ORGANIZATION

## 23. Entitlement State

Allowed states:

- ACTIVE
- EXPIRED
- SUSPENDED
- REVOKED
- PENDING

Entitlement state must originate from an authorized server-side source.

## 24. Entitlement Boundary

Entitlement does not override:

- authorization
- safety gates
- evidence requirements
- legal requirements
- vehicle read-only rules
- AI capability restrictions

PREMIUM is never equivalent to ADMINISTRATOR.

## 25. Feature-State Contract

Logical entity:

feature_state

Minimum fields:

- feature_id
- feature_code
- lifecycle_state
- audience_scope
- effective_from
- source_version
- updated_at
- schema_version

## 26. Feature Lifecycle States

Allowed states:

- DISABLED
- COMING_SOON
- PREVIEW
- SIMULATED
- VALIDATED
- AVAILABLE
- REAL_WORLD

REAL_WORLD may only be used where independently justified.

Feature lifecycle state does not equal evidence strength.

## 27. Feature Audience Scope

A feature may be scoped to:

- PUBLIC
- AUTHENTICATED
- PREMIUM
- ORGANIZATION
- ADMINISTRATOR
- CONTROLLED_TEST

Audience scope is not a substitute for server authorization.

## 28. Audit Event Contract

Logical entity:

audit_event

Minimum common fields:

- event_id
- occurred_at
- actor_type
- actor_id
- module
- action
- target_type
- target_id
- result
- correlation_id
- schema_version

Optional metadata must be:

- bounded
- classified
- secret-free

## 29. Audit Actor Types

Initial actor types:

- USER
- ADMINISTRATOR
- SYSTEM
- SERVICE

AI must not be treated as an independent unrestricted administrator.

## 30. Audit Results

Initial result values:

- SUCCESS
- DENIED
- FAILED
- PARTIAL

Detailed sensitive failure information should remain internal.

## 31. Audit Immutability Principle

Sensitive audit events should be append-only in normal application operation.

Ordinary application users must not be able to edit or delete audit records.

Retention and archival require separate policy.

## 32. PII Classification Boundary

Examples of PII:

- email
- display name
- precise contact data
- identity-verification data
- private user profile information

PII must not be sent by default to:

- AI Agent
- public logs
- public analytics
- scientific evidence bundles
- unrelated modules

## 33. Sensitive Account Data

SENSITIVE_ACCOUNT includes:

- account status
- security state
- organization memberships
- role assignments
- entitlement details
- recovery/security metadata

It must not be publicly exposed.

## 34. Security-Sensitive Data

SECURITY_SENSITIVE includes:

- authentication events
- session identifiers where applicable
- abuse-control signals
- elevated-operation records
- security investigation references

Secrets themselves must never enter general audit payloads.

## 35. Session Boundary

Provider session secrets are not stored in E-ZERO business tables.

If E-ZERO stores session metadata later, it may contain only non-secret
references required for:

- device/session listing
- revocation tracking
- security review

Raw refresh tokens must not be stored in application profile tables.

## 36. API Base Version

Initial API namespace:

/api/identity/v1

Breaking contract changes require a new API version or separately reviewed
migration strategy.

## 37. API Response Envelope

Successful responses should use a stable envelope conceptually containing:

- request_id
- status
- data
- schema_version

No secret fields may be returned.

## 38. API Error Envelope

Errors should contain:

- request_id
- status
- error_code
- safe_message
- schema_version

Do not expose:

- stack traces
- database queries
- provider secrets
- internal token values
- account-existence details where sensitive

## 39. Stable Error Codes

Initial error codes may include:

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
- ACCOUNT_SUSPENDED
- TEMPORARILY_UNAVAILABLE

## 40. Request Correlation

Every API request should receive or generate a correlation/request identifier.

Correlation identifiers should connect:

- API request
- authorization decision
- audit event
- internal service error

They must not contain PII.

## 41. GET /api/identity/v1/me

Purpose:

Return the minimum current authenticated account context.

May return:

- user_id
- display_name
- preferred_language
- country_or_region
- timezone
- account_status
- organization summaries
- safe entitlement capabilities
- feature availability references

Must not return:

- raw auth tokens
- service credentials
- recovery secrets
- unrelated private records

## 42. PATCH /api/identity/v1/me

Purpose:

Update permitted self-service profile fields.

Permitted examples:

- display_name
- preferred_language
- country_or_region
- timezone

Must not permit direct client changes to:

- user_id
- account_status
- roles
- entitlements
- organization authority
- audit records

## 43. GET /api/identity/v1/organizations

Purpose:

Return organizations accessible to the authenticated user.

Only active/permitted memberships may be returned according to policy.

No other organization's private records may appear.

## 44. GET /api/identity/v1/organizations/{organization_id}

Purpose:

Return safe organization context for an authorized member.

Server must verify membership and authorization.

Changing the URL organization_id must not bypass tenant isolation.

## 45. GET /api/identity/v1/organizations/{organization_id}/memberships

Purpose:

Return membership data only when the caller has explicit permission.

Ordinary organization members must not automatically receive sensitive
membership administration data.

## 46. Membership Mutation Boundary

Creating, changing or revoking organization membership requires:

- authenticated caller
- server-side role check
- target-organization verification
- bounded role value
- audit event
- correlation identifier

Self-promotion to ORGANIZATION_MANAGER or ADMINISTRATOR is forbidden.

## 47. GET /api/identity/v1/features

Purpose:

Return the authoritative safe feature-state view appropriate to the caller.

The server may filter based on:

- authentication
- audience scope
- entitlement
- organization context

The frontend must not override this state.

## 48. GET /api/identity/v1/entitlements

Purpose:

Return safe capability-level entitlement information for the authenticated
subject.

It must not expose:

- payment credentials
- provider secrets
- unrelated billing records

## 49. GET /api/identity/v1/notification-preferences

Purpose:

Return user notification preferences.

## 50. PATCH /api/identity/v1/notification-preferences

Purpose:

Update optional notification preferences.

Server must preserve required security/account message rules.

Marketing opt-out must be respected.

## 51. GET /api/identity/v1/consents

Purpose:

Return the user's own consent history or current consent state as permitted.

## 52. POST /api/identity/v1/consents

Purpose:

Record an explicit consent change.

Consent mutation must:

- validate consent_type
- record policy_version
- record timestamp
- record source
- create audit event where appropriate

## 53. POST /api/identity/v1/logout

Purpose:

End the current authenticated session through the approved provider/backend
flow.

Logout must not depend only on hiding frontend state.

## 54. Session Revocation Contract

A future session-revocation endpoint may revoke:

- current session
- selected session
- all user sessions

Exact provider mechanics require implementation-stage validation.

No session secret should be exposed in the public API.

## 55. Account Recovery API Boundary

Recovery endpoints must:

- resist account enumeration
- apply rate limits
- use generic external responses
- audit security-relevant outcomes
- keep recovery tokens out of logs

Exact provider callback paths remain implementation-specific.

## 56. Authentication Callback Boundary

Provider callback endpoints must:

- validate expected provider state
- reject invalid/expired flows
- avoid open redirects
- use allowlisted return destinations
- avoid exposing tokens in logs

## 57. API Input Validation

All endpoints must validate:

- type
- length
- allowed enum
- format
- required fields
- unknown-field policy

Unbounded arbitrary metadata is forbidden in Phase 1 identity APIs.

## 58. API Output Minimization

Responses must return only fields necessary for the calling workflow.

Database rows must not be serialized directly to clients without an explicit
response schema.

## 59. Pagination

Collection endpoints that may grow must support bounded pagination.

Do not allow unbounded organization or membership dumps.

Exact pagination format may be:

- cursor-based preferred
- bounded page size

Maximum limits must be server-controlled.

## 60. Idempotency

High-impact or retry-prone mutation APIs should support idempotency where
appropriate.

Examples:

- organization creation
- invitations
- entitlement event intake
- administrative broadcast creation in future

Idempotency identifiers must not contain secrets.

## 61. Concurrency

Updates to security-sensitive state should use appropriate concurrency control.

Examples:

- membership role changes
- account status changes
- entitlement state
- consent updates where version conflicts matter

Silent last-write-wins behavior should be avoided for high-impact changes.

## 62. CORS Boundary

Identity APIs must use an explicit origin allowlist.

Do not use unrestricted wildcard CORS for credentialed sensitive endpoints.

## 63. CSRF Boundary

If cookie-based authenticated sessions are used, CSRF protection must be
evaluated and implemented according to the final session architecture.

SameSite alone must not be assumed sufficient for every flow.

## 64. Rate-Limit Contract

Authentication and identity endpoints must declare rate-limit classes.

Initial logical classes:

- AUTH_STANDARD
- AUTH_SENSITIVE
- RECOVERY
- PROFILE_WRITE
- ADMIN_WRITE

Exact thresholds remain implementation configuration, not hard-coded public API
contracts.

## 65. Abuse-Control Contract

Abuse-control decisions may use:

- authenticated identity
- source/network signals
- device/session signals
- attempt frequency
- endpoint class

The external response must avoid disclosing sensitive detection logic.

## 66. Administrative API Boundary

Administrative endpoints must be separate from ordinary self-service APIs.

Requirements:

- authenticated administrator
- explicit server-side capability
- stronger authentication where justified
- target scope
- audit event
- confirmation for high-impact actions

Frontend visibility never grants admin authority.

## 67. AI Account Context Contract

AI may receive a minimized context object containing only approved fields such
as:

- authenticated
- role_family
- organization_context_id
- capability_codes
- preferred_language
- allowed_feature_codes

The AI context must not include by default:

- raw email
- auth token
- refresh token
- service key
- recovery token
- private audit data

## 68. AI Action Boundary

AI-requested external actions must use normal authorized APIs.

AI cannot bypass:

- authentication
- tenant checks
- feature state
- entitlement checks
- safety gates
- audit
- authorization

Existing invariants remain:

DIAGNOSTIC_CLAIM = FALSE
EVIDENCE_AUTHORITY = FALSE

## 69. Messaging Integration Contract

Identity may provide Messaging Core with only necessary addressing context.

Examples:

- user_id
- preferred language
- notification category
- consent state
- authorized channel reference

Messaging must not receive unrestricted Identity database access.

## 70. Billing Integration Contract

Billing/provider integrations may submit verified entitlement events through a
separately authenticated server-side interface.

Public clients must never directly declare themselves PREMIUM.

Payment credentials must not enter Identity profile tables.

## 71. Evidence Boundary

Identity API responses are not scientific evidence.

No Identity endpoint may modify:

- Evidence Registry
- raw sensor evidence
- scientific validation output
- frozen scientific claims

## 72. Vehicle Boundary

No Identity endpoint may grant direct:

- ECU write
- DTC clear
- flashing
- coding
- programming
- actuator control
- sensor modification
- safety-system modification

Vehicle governance remains separate.

## 73. Database Constraints

Implementation should use database constraints where appropriate for:

- primary keys
- foreign keys
- uniqueness
- bounded status values
- membership integrity
- non-null required fields

Application validation must not be the only integrity mechanism.

## 74. Deletion Boundary

Account deletion implementation requires a separate retention/deletion policy.

It must consider:

- legal retention
- security audit retention
- organization ownership transfer
- entitlement history
- consent history
- anonymization/pseudonymization
- user-controlled data

Do not implement destructive cascade deletion without a reviewed plan.

## 75. Data Export Boundary

Future account export must:

- authenticate the requesting user
- authorize scope
- exclude other users' private data
- avoid secrets
- record audit event where appropriate

## 76. Schema Migration Rule

Any implementation schema migration must:

- have a version
- have reviewable SQL/migration source
- have rollback/forward strategy
- pass local/staging tests
- avoid unrelated changes

This specification does not create migrations.

## 77. Secret Scanning Requirement

Before every merge/deployment of Identity code:

- scan for provider secrets
- scan for service-role keys
- scan for database credentials
- scan for email-provider credentials
- scan for private keys

Known public-safe provider identifiers must not be confused with privileged
service credentials.

## 78. Required Contract Tests

Before public activation, tests must include:

- /me isolation
- profile-field allowlist
- account-status write rejection
- role self-promotion rejection
- tenant URL tampering rejection
- cross-user rejection
- cross-organization rejection
- suspended membership rejection
- revoked membership rejection
- feature-disabled behavior
- entitlement cannot grant admin
- marketing preference behavior
- consent recording
- logout behavior
- rate limiting
- safe error envelopes
- no token leakage
- no raw email exposure to AI context
- audit correlation

## 79. Contract Versioning

Each API response must be traceable to a schema/API version.

Breaking changes require:

- new version
- migration plan
- compatibility review
- regression tests

Do not silently change public response meaning.

## 80. Implementation Order

After this contract is reviewed and frozen:

1. create separate Identity service repository
2. create non-production Supabase project
3. create development schema migrations
4. implement minimum RLS policies
5. implement versioned Identity API
6. implement audit envelope
7. implement privacy/redaction boundary
8. implement authentication flow
9. implement tenant tests
10. implement role/authorization tests
11. implement feature-state interface
12. implement notification/consent endpoints
13. implement entitlement-reference interface
14. run security/privacy regression
15. stage only
16. public activation only after explicit approval

## 81. Current Boundary

This document does NOT:

- create Supabase tables
- create SQL migrations
- create a Supabase project
- collect user emails
- deploy authentication
- deploy an Identity API
- activate organization accounts
- activate premium plans
- activate messaging
- activate Professional Network
- activate Workshop
- activate Marketplace
- change AI authority
- change vehicle authority
- change scientific evidence

Implementation remains behind a separately reviewed implementation gate.
