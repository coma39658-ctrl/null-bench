# E-ZERO Identity Technology Selection ADR V0.1

Status: PROPOSED ARCHITECTURE DECISION
Version: 0.1
Decision Date: 2026-09-17

Base Plan:
EZERO_IDENTITY_PHASE1_FOUNDATION_IMPLEMENTATION_PLAN_V0_1

Base Commit:
f67e1d4c1cbfa4066676e83178d4b9e0ea6d4562

Implementation Status: NOT STARTED
Production Activation: NOT AUTHORIZED

## 1. Decision

Select Supabase as the preferred Phase 1 managed platform for:

- authentication
- identity persistence
- Postgres account data
- organization membership data
- server-enforced row-level access controls where appropriate

Supabase is selected for Phase 1 subject to:

- staging validation
- security testing
- privacy testing
- tenant-isolation testing
- cost review before production
- rollback planning

This ADR does not authorize production deployment.

## 2. Why a Managed Identity Platform

E-ZERO will not build custom authentication cryptography.

Phase 1 requires:

- verified email identity
- magic-link or OTP capability
- secure sessions
- recovery support
- server-side authorization
- tenant isolation
- auditability
- low initial operating cost
- future scalability

A managed identity platform reduces unnecessary security risk and engineering burden.

## 3. Options Reviewed

The following were reviewed:

- Supabase
- Firebase Authentication / Identity Platform
- Auth0
- Clerk
- minimal first-party identity service

## 4. Supabase Assessment

Strengths:

- managed authentication
- email/passwordless methods
- magic link
- OTP
- JWT authentication
- Postgres database
- Row Level Security integration
- standard SQL/Postgres foundation
- organization and account data can remain in relational schemas
- suitable for explicit tenant isolation
- free development tier
- production upgrade path
- self-hosting / portability options exist at architecture level
- compatible with separate backend service design

Important boundaries:

- Supabase Auth is identity infrastructure, not E-ZERO authorization policy itself
- RLS supplements server-side authorization; it does not replace application policy
- Supabase Billing will not define E-ZERO entitlement architecture
- Supabase user metadata must not become scientific evidence
- Supabase must not gain vehicle-control authority
- secrets must remain server-side

## 5. Current Supabase Cost Context

As reviewed on 2026-09-17:

Free tier currently includes:

- 50,000 monthly active users
- Postgres database
- authentication
- basic MFA
- Row Level Security support through Postgres
- limited storage/egress resources

Pro currently starts at approximately USD 25/month and includes a larger production resource envelope and 100,000 included MAU before additional MAU charges.

These prices and quotas are operational inputs, not frozen E-ZERO assumptions.

They must be rechecked before production purchase.

## 6. Supabase Free-Tier Limitation

The Free tier is acceptable for:

- development
- architecture validation
- early staging
- limited controlled testing

It must not automatically be treated as the final production environment.

Important current limitations include:

- free projects may pause after inactivity
- reduced audit-log retention
- some advanced security/session features require paid tiers
- production capacity is smaller than paid environments

Production readiness therefore requires a separate cost/security review.

## 7. Firebase Assessment

Strengths:

- mature managed authentication
- strong ecosystem
- email and social authentication
- multi-tenancy capability through Identity Platform
- mature operational infrastructure

Concerns for E-ZERO Phase 1:

- different database/security model from the preferred relational Postgres architecture
- increased ecosystem coupling if broader Firebase services are adopted
- free-plan usage model differs from Supabase
- relational organization/tenant design would require additional architectural choices

Decision:

DEFER / ALTERNATIVE

Firebase remains a fallback option if Supabase staging fails a required gate.

## 8. Auth0 Assessment

Strengths:

- mature dedicated identity platform
- passwordless authentication
- organization support
- enterprise identity features
- strong authentication specialization

Concerns:

- advanced production features may become comparatively costly
- separate application database still required
- additional integration layer required for E-ZERO organization/data isolation
- may be more capability than Phase 1 currently requires

Decision:

DEFER / ENTERPRISE ALTERNATIVE

Auth0 remains appropriate for future enterprise requirements if needed.

## 9. Clerk Assessment

Strengths:

- polished authentication UI
- account-management components
- organization capabilities
- convenient developer experience
- optional billing integration
- generous current entry tier

Concerns:

- tighter coupling to Clerk-specific UI/workflows is possible
- integrated billing must not replace E-ZERO's separate entitlement architecture
- E-ZERO requires stronger separation between identity and commercial logic
- relational E-ZERO operational data still requires a separate data architecture

Decision:

DEFER / ALTERNATIVE

Clerk may be reconsidered if rapid frontend identity UX becomes the overriding requirement.

## 10. First-Party Identity Service Assessment

Potential strengths:

- maximum control
- provider independence

Major concerns:

- authentication security burden
- token lifecycle complexity
- recovery security
- email verification security
- session security
- abuse prevention
- operational maintenance
- security patch responsibility
- higher implementation risk

Decision:

REJECT FOR PHASE 1

E-ZERO will not build its own authentication cryptography or complete identity provider.

## 11. Selected Architecture

Phase 1 preferred architecture:

E-ZERO Public UI
        |
        v
Versioned Identity API / Backend Boundary
        |
        +--> Supabase Auth
        |
        +--> Supabase Postgres
        |
        +--> RLS / tenant constraints
        |
        +--> E-ZERO authorization policy
        |
        +--> E-ZERO audit layer
        |
        +--> E-ZERO privacy/redaction layer

Supabase does not replace E-ZERO governance.

## 12. Repository Boundary

Identity production backend must remain separate from:

- Null Bench scientific code
- public static website code
- Evidence Registry
- OBD modules
- AI retrieval core
- workshop modules
- marketplace modules

The current null_bench_public repository may contain:

- ADR documents
- public client contracts
- public integration documentation

It must not contain production identity secrets.

## 13. Proposed Identity Service Repository

A separate repository/service should be created after this ADR is frozen.

Working logical name:

ezero_identity_service

Final repository naming may be reviewed before creation.

The service should contain:

- backend API
- Supabase integration
- authorization policies
- tenant checks
- account schemas
- audit integration
- privacy/redaction logic
- tests
- deployment configuration templates

No production secret belongs in Git.

## 14. Authentication Flow

Preferred first authentication flow:

1. user enters email
2. server/provider generates one-time verification mechanism
3. verification occurs through OTP or magic link
4. identity provider verifies token
5. server establishes authenticated session
6. E-ZERO loads minimum authorized account context
7. server independently evaluates permissions

Frontend state never grants authorization.

## 15. Initial Auth Method Decision

Phase 1 should implement one primary passwordless email flow first.

Preferred:

EMAIL OTP or MAGIC LINK

Final choice between OTP and magic link must be made during implementation based on:

- mobile usability
- email deliverability
- redirect reliability
- security
- implementation simplicity

Do not implement every authentication method simultaneously.

## 16. Password Decision

Traditional password login is not required for initial Phase 1.

It may be added later if user/business requirements justify it.

This reduces:

- password-storage concerns
- password-reset complexity
- credential-stuffing exposure

## 17. MFA Decision

MFA architecture remains supported.

Initial public users do not require mandatory MFA.

Future stronger authentication should be required or strongly considered for:

- administrators
- sensitive company roles
- regulated workflows
- high-impact security actions

## 18. Passkey Decision

Passkeys are:

DEFERRED

The architecture must not block future passkey support.

They are not required for initial account activation.

## 19. Database Choice

Selected:

PostgreSQL through Supabase for Phase 1 identity/account data.

Reasons:

- relational integrity
- organization/member relationships
- standard SQL
- explicit constraints
- transaction support
- RLS capability
- portability advantage relative to proprietary document-only schemas

## 20. Schema Separation

Identity data must use explicitly separated schemas/tables.

Initial logical domains may include:

- identity_profile
- organization
- organization_membership
- role_assignment
- notification_preference
- entitlement_reference
- feature_state_reference
- audit_reference

Scientific evidence tables must remain separate.

## 21. Supabase Auth Boundary

Supabase Auth is responsible for:

- identity authentication
- token/session primitives
- email authentication mechanisms

E-ZERO remains responsible for:

- domain authorization
- organization context
- entitlement interpretation
- safety policy
- AI capability gates
- audit requirements
- privacy rules
- vehicle/evidence boundaries

## 22. Row Level Security

RLS should be used where appropriate for sensitive multi-tenant tables.

RLS rules must be:

- explicit
- version controlled
- testable
- minimal
- deny-by-default where practical

RLS is defense in depth.

It does not replace server-side authorization.

## 23. Service-Role Secret Boundary

Any elevated Supabase service credential must:

- remain server-side
- never appear in browser JavaScript
- never be committed to Git
- never appear in public logs
- be stored using deployment secret management
- be rotatable

Public anonymous keys must not be treated as administrative secrets.

## 24. Tenant Isolation

Organization isolation must use multiple controls:

- authenticated identity
- server-side organization context
- object ownership checks
- scoped database queries
- RLS where appropriate
- negative cross-tenant tests
- audit events

No single frontend identifier may determine tenant access.

## 25. Authorization Architecture

Phase 1 authorization remains:

small RBAC + scoped attributes/memberships.

Do not encode future domain complexity prematurely.

Initial role families remain:

- USER
- PROFESSIONAL
- ORGANIZATION_MANAGER
- ADMINISTRATOR

Specific domain memberships remain scoped relationships.

## 26. Email Delivery Separation

Authentication provider and email-delivery provider are separate concerns.

Before production:

- sender domain must be verified
- SPF must be configured
- DKIM must be configured
- DMARC strategy must be defined
- bounce handling must exist
- complaint handling must exist

Marketing and transactional communication remain separate.

## 27. Messaging Separation

Selecting Supabase does not authorize building messaging inside Supabase Auth.

Governed E-ZERO Messaging Core remains a separate logical service/interface.

Authentication events may request transactional notifications through approved interfaces.

## 28. Billing Separation

Do not use authentication-platform convenience features to merge billing and identity.

E-ZERO entitlement state remains an independent interface.

Payment provider events may update entitlement only through verified server-side workflows.

## 29. AI Boundary

AI Agent must not directly receive Supabase administrative access.

AI may receive only approved minimal account context.

AI must not receive by default:

- raw email
- auth token
- refresh token
- service key
- recovery token
- private organization records

Every AI-requested action still passes server-side capability gates.

## 30. Evidence Boundary

Supabase identity/database records are not scientific evidence by default.

Identity data must not modify:

- Evidence Registry
- raw sensor evidence
- validation outputs
- frozen scientific claims

## 31. Vehicle Boundary

Technology selection does not modify existing vehicle rules.

No identity role, premium plan or Supabase session grants:

- ECU write
- DTC clearing
- flashing
- coding
- programming
- actuator control
- sensor alteration
- safety-system control

## 32. Privacy Boundary

PII remains private by default.

Email should be accessible only to services with explicit need.

Analytics should receive pseudonymous identifiers where possible.

AI should receive redacted/minimal context.

Public logs must not contain raw sensitive identity data.

## 33. Data Residency

Before international production deployment, review:

- project region
- user geography
- applicable privacy requirements
- data residency requirements
- backup location
- provider subprocessors

No assumption is made that one region satisfies every country.

## 34. Backup and Recovery

Production selection must define:

- database backup policy
- restoration test
- migration backup
- rollback process
- retention policy

Free-tier development limitations must not be mistaken for production backup guarantees.

## 35. Vendor Lock-In Control

To limit unnecessary coupling:

- use standard Postgres schemas
- keep E-ZERO domain authorization separate
- version API contracts
- avoid provider-specific business logic in public clients
- isolate provider SDK use behind service adapters where practical
- document migrations

## 36. Cost Control

Before production upgrade:

- estimate MAU
- estimate database size
- estimate egress
- estimate email volume
- estimate storage
- estimate backups
- estimate audit-log needs

Unexpected automatic spend must be constrained where provider controls permit it.

## 37. Development Environment

Initial development may use a non-production Supabase project.

It must use:

- synthetic/test users
- non-production data
- no real payment information
- no sensitive vehicle evidence
- no production secrets

## 38. Staging Environment

Before public activation, staging must validate:

- signup/login
- email verification
- recovery
- sessions
- RLS
- tenant isolation
- role enforcement
- rate limits
- audit events
- PII redaction
- failure modes
- rollback

## 39. Production Separation

Production must have:

- separate project/environment
- separate secrets
- separate database
- production-approved email configuration
- stricter access permissions
- monitored audit/security events

Development credentials must not access production.

## 40. Operational Monitoring

Production planning must cover:

- authentication error rates
- suspicious login activity
- verification failures
- rate-limit events
- tenant-access failures
- elevated/admin operations
- provider outages

Monitoring data must respect privacy classification.

## 41. Failure Mode

If Supabase is unavailable:

- authentication-sensitive operations fail closed
- existing public static research may remain available
- Null Bench must remain independent where possible
- Evidence Registry must remain unchanged
- AI must not invent account state
- vehicle permissions must not change

## 42. Migration Escape Plan

If Supabase becomes unsuitable later:

- export standard Postgres application data
- maintain stable E-ZERO API contracts
- replace identity adapter
- revalidate authentication/session model
- migrate users through a separately reviewed process

Provider migration must never be improvised on production users.

## 43. Decision Summary

SELECT:

Supabase Auth + Supabase PostgreSQL

for Phase 1 development/staging, subject to all frozen E-ZERO safety and governance rules.

KEEP:

E-ZERO server-side authorization
E-ZERO audit
E-ZERO privacy/redaction
E-ZERO messaging governance
E-ZERO entitlement separation
E-ZERO AI capability gates
E-ZERO vehicle/evidence boundaries

DEFER:

Firebase
Auth0
Clerk
first-party identity provider
passkeys
broad MFA rollout

## 44. Reconsideration Triggers

Revisit this decision if:

- required region/data residency is unavailable
- tenant isolation cannot meet tests
- security requirements exceed available plan capability
- cost becomes materially unsuitable
- provider reliability is inadequate
- required authentication capability cannot be safely implemented
- regulatory requirements require another architecture

## 45. Next Gate

After this ADR is reviewed and frozen:

1. create a separate Identity implementation repository/service
2. create schema/API contract preregistration
3. create non-production Supabase project
4. configure development-only authentication
5. implement minimum foundations
6. test before any public integration

No production activation is authorized by this ADR.

## 46. Current Boundary

This ADR does NOT:

- create a Supabase project
- collect user emails
- deploy login
- create production accounts
- configure production email
- expose secrets
- activate billing
- modify the public website
- change AI authority
- change vehicle authority
- change scientific evidence

All implementation remains behind a separately reviewed gate.
