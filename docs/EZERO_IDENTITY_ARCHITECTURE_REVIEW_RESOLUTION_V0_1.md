# E-ZERO Identity Architecture Review Resolution V0.1

Status: REVIEW RESOLUTION / PREREGISTRATION
Version: 0.1
Base Frozen Spec: EZERO_IDENTITY_ACCOUNTS_MESSAGING_ARCHITECTURE_V0_1
Base Commit: adfc139767fcaa044db97dd0a6bbad60b0969817

## 1. Purpose

This document records engineering decisions made after independent architecture review.

The frozen V0.1 specification remains unchanged.

This document determines which recommendations are:

- IMPLEMENT NOW
- DEFINE INTERFACE NOW / DEFER IMPLEMENTATION
- FUTURE / DORMANT
- REJECT

No implementation is authorized by this document alone.

## 2. Governing Principle

E-ZERO will prefer the smallest robust architecture that:

- is secure
- is maintainable
- avoids duplicated systems
- preserves module separation
- preserves scientific and safety boundaries
- supports future expansion through explicit interfaces
- avoids premature regulatory and operational complexity

Feature quantity is not a success metric.

## 3. Access-Control Model

Decision: IMPLEMENT NOW

Do not implement a large fixed matrix of many domain roles at the first stage.

Initial authorization shall use:

- a small RBAC core
- limited domain attributes / relationships
- server-side authorization checks
- explicit organization / tenant context

Initial role families should remain limited, for example:

- USER
- PROFESSIONAL
- ORGANIZATION_MANAGER
- ADMINISTRATOR
- READ_ONLY / VIEWER where needed

Domain-specific facts such as:

- vehicle owner
- driver
- technician
- fleet member
- workshop member

should initially be represented through scoped attributes or memberships where appropriate.

Future roles remain reserved but are not activated automatically.

## 4. External Policy Engine

Decision: DEFER

OPA, Casbin or another dedicated policy engine is not required for the first implementation.

The architecture shall keep a clean policy abstraction so a dedicated engine can be introduced later if authorization complexity justifies it.

Do not add a heavy policy dependency prematurely.

## 5. Governed Messaging Core

Decision: IMPLEMENT NOW

E-ZERO should have one governed messaging/delivery core rather than multiple incompatible delivery engines.

The common core may provide:

- message identifier
- sender context
- recipient context
- created timestamp
- delivery state
- read state
- acknowledgement state where applicable
- priority
- channel
- audit reference
- schema version

Different modules may use separate contexts, including:

- account/security notifications
- product/system updates
- fleet dispatch
- direct professional messages
- workshop messages
- administrative broadcasts

Context-specific rules remain separate.

Existing Stage B/C communication boundaries must remain preserved.

Voice Note policy remains human-to-human and must not be conflated with Voice Guide or AI TTS.

## 6. Shared Audit Foundation

Decision: IMPLEMENT NOW

All sensitive modules should use a common audit envelope.

Minimum common fields:

- event_id
- timestamp
- actor_id or system actor
- module
- action
- target reference
- result
- correlation_id
- schema_version

Module-specific payloads may remain separate.

Secrets and raw credentials must never be stored in audit logs.

Audit storage must support cross-module investigation.

## 7. Data Classification Foundation

Decision: IMPLEMENT NOW

E-ZERO shall define a shared data-classification policy.

Initial classes:

- PUBLIC
- INTERNAL
- PII
- SENSITIVE_ACCOUNT
- SECURITY_SENSITIVE
- EVIDENCE
- REGULATED

Each module must classify stored and transmitted data.

Classification must influence:

- logging
- storage
- retention
- sharing
- AI access
- analytics access
- export
- deletion
- encryption requirements

## 8. PII Redaction / Privacy Boundary

Decision: IMPLEMENT NOW

A shared privacy/redaction layer should protect sensitive personal information before data reaches:

- AI prompts
- analytics
- public logs
- public error reports
- evidence bundles
- unrelated modules

Raw email addresses should not be supplied to the AI Agent by default.

Redaction must be enforced technically rather than relying only on developer memory.

## 9. Central Rate-Limit and Abuse-Control Policy

Decision: IMPLEMENT NOW

Rate limiting and abuse controls should use a shared security policy/service where practical.

It should support different policies for:

- authentication
- account recovery
- messaging
- AI requests
- media upload
- administrative actions
- future public APIs

Individual modules may define limits but should not each invent incompatible rate-limit infrastructure.

## 10. Feature-State Registry

Decision: IMPLEMENT NOW

Public feature status must not be scattered across unrelated frontend files.

Create a governed feature-state registry or equivalent authoritative configuration.

Supported lifecycle states should include:

- DISABLED
- COMING_SOON
- PREVIEW
- SIMULATED
- VALIDATED
- AVAILABLE
- REAL_WORLD where specifically proven and applicable

Feature status must not imply scientific evidence strength.

The AI Agent, public UI and administrative interfaces should consume the same authoritative status source where practical.

## 11. Company / Tenant Isolation

Decision: IMPLEMENT NOW

Organization data isolation must be enforced beyond frontend visibility.

Requirements include:

- server-side tenant checks
- organization-scoped queries
- prevention of cross-company object access
- authorization tests
- auditability

When the chosen database supports appropriate row-level security or an equivalent database-level isolation mechanism, it should be evaluated and preferred for sensitive multi-tenant data.

Application logic alone must not be the only long-term isolation boundary.

## 12. AI Server-Side Capability Gate

Decision: IMPLEMENT NOW

Prompt instructions alone are not sufficient authorization.

All AI-assisted actions that touch another service must pass through independently enforced server-side capability checks.

The AI Agent must never directly obtain authority to:

- change roles
- change entitlements
- modify account security
- send unrestricted broadcasts
- release payments
- change scientific evidence
- control vehicle systems
- control machinery
- override safety gates

Existing invariants remain:

DIAGNOSTIC_CLAIM = FALSE
EVIDENCE_AUTHORITY = FALSE

## 13. AI Knowledge and Evidence Relationship

Decision: KEEP EXISTING GOVERNANCE / FIX IMPLEMENTATION GAP SEPARATELY

Existing E-ZERO retrieval governance already establishes that:

- browser retrieval hints are not evidence authority
- server-side approved knowledge resolution is authoritative
- Evidence Registry remains scientific authority
- unknown/unverified knowledge must fail closed
- user text is not automatically promoted to evidence
- retrieval does not increase scientific evidence strength

The current live gateway knowledge-resolution/synchronization issue must be repaired as a separate gateway task.

Do not weaken fail-closed behavior to make the AI answer.

Do not mix that gateway repair with Identity implementation.

## 14. Knowledge Bundle Governance

Decision: DEFINE INTERFACE NOW / KEEP SEPARATE

Knowledge-bundle creation, approval, manifest integrity, hashing, source provenance, freshness and server-side resolution remain governed by the existing AI retrieval specifications.

If additional lifecycle detail is required later, create a separate knowledge-lifecycle specification.

Do not make Identity an evidence or knowledge authority.

## 15. Authentication Foundation

Decision: IMPLEMENT NOW

Initial account work should focus on:

- verified email ownership
- secure authentication
- secure sessions
- logout
- revocation
- account recovery
- enumeration resistance
- rate limiting
- audit
- privacy

Prefer the simplest secure authentication approach appropriate to the deployment.

Do not build every possible authentication method in the first release.

Passkeys and stronger MFA remain clean future extensions where justified.

## 16. Premium / Entitlement Separation

Decision: DEFINE INTERFACE NOW / IMPLEMENT AFTER IDENTITY FOUNDATION

Identity and billing must remain separate.

Identity may consume verified entitlement state.

Payment logic must not be embedded in authentication.

Premium access must never bypass:

- safety rules
- evidence rules
- legal requirements
- role permissions
- high-risk repair gates
- vehicle read-only boundaries

## 17. Compliance Capability

Decision: DEFINE INTERFACE NOW / ACTIVATE ONLY WHERE REQUIRED

Do not impose full KYC/AML architecture on every E-ZERO user.

Reserve a compliance interface for workflows that legally require it.

Possible future regulated services may require:

- identity verification
- KYC
- AML
- sanctions checks
- fraud controls
- transaction monitoring

These become active only when the relevant regulated service is separately approved.

## 18. Workshop Workflow

Decision: DEFER TO NEXT PHASE

Workshop functionality is valuable but should not be mixed into the first Identity implementation.

Future separate module may include:

- workshop accounts
- technician memberships
- bookings
- job workflow
- quotations
- inspection records
- customer communication
- parts requests
- service-history references

Identity provides authentication, role context and entitlement only.

## 19. Visual Assistant & Workshop Guide

Decision: DEFER TO NEXT PHASE

Maintain as a separate extension.

Potential capabilities:

- image/video observation
- warning-light recognition
- fault-code recognition
- part/tool identification
- safe role-based repair guidance
- audio/smoke observations

Media observation remains advisory and not diagnostic authority.

High-risk work requires explicit safety gates.

No direct vehicle actuation or write access is permitted.

## 20. Professional Network & Business Community

Decision: FUTURE / DORMANT

Preserve the concept but do not implement it during the Identity foundation phase.

Future scope may include:

- professional profiles
- company pages
- professional feed
- jobs
- hiring
- projects
- portfolios
- business matchmaking
- RFQs
- tenders
- events
- professional messaging
- moderation
- anti-spam/fraud controls

It must remain a professional/business network rather than a general entertainment social feed.

No proprietary third-party social-network code or branding is to be copied.

## 21. Marketplace

Decision: FUTURE / DORMANT

Do not implement during the present phase.

Keep only clean extension points for future:

- vehicle listings
- parts
- workshops
- valuation
- buyer/seller workflows
- inspection
- document verification

Marketplace work requires a separate business, legal, security and compliance review before activation.

## 22. Broker / Escrow / Transaction Orchestration

Decision: FUTURE / DORMANT

No current implementation.

If later pursued:

- AI may guide workflow only
- E-ZERO must not casually custody funds
- licensed payment/escrow providers should be used where applicable
- regulatory requirements must be independently reviewed

## 23. Cybersecurity and Null Bench Extensions

Decision: FUTURE / DORMANT

Preserve future extension capability.

Null Bench remains scientifically unchanged and domain-agnostic.

Potential future defensive adapters may cover:

- network anomaly screening
- OT/ICS monitoring
- communication graphs
- telecom resilience
- infrastructure dependency
- fraud/transaction graphs
- supply-chain graphs

Each requires separate:

- adapter
- schema
- validator
- permissions
- evidence classification

Cybersecurity integrations are defensive and authorized only.

## 24. Vehicle / OBD Boundary

Decision: PRESERVE EXISTING FROZEN RULES

Identity, premium status or AI must never automatically grant:

- ECU writes
- DTC clearing
- flashing
- coding
- programming
- actuator control
- sensor modification
- safety-system control

Vehicle permissions remain independently governed.

## 25. Public UI Boundary

Decision: PRESERVE

The public interface may present a unified experience.

Internal responsibilities remain separated.

Frontend state is never authorization.

Frontend text is never scientific evidence authority.

## 26. Implementation Priority

Approved sequence:

PHASE 1 — FOUNDATION
- Identity/authentication
- small RBAC + scoped attributes
- tenant isolation
- shared audit envelope
- data classification
- privacy/PII redaction
- rate-limit/abuse controls
- feature-state registry
- governed messaging core foundation

PHASE 2 — ACCOUNT SERVICES
- notification preferences
- secure administrative communication
- entitlement interface
- organization memberships
- account management

PHASE 3 — CONTROLLED PRODUCT EXTENSIONS
- premium/entitlements
- workshop workflow
- Visual Assistant
- gated AI-account integration

PHASE 4 — BUSINESS PLATFORM
- Professional Network
- company ecosystem
- business discovery

PHASE 5 — HIGH-COMPLEXITY / REGULATED SERVICES
- marketplace
- broker workflows
- escrow/payment integrations
- regulated compliance services

PHASE 6 — ADDITIONAL DOMAIN ADAPTERS
- industrial
- cybersecurity
- telecom
- infrastructure
- other scientifically appropriate domains

Each phase requires its own reviewed gate.

## 27. Explicit Rejections for Current Implementation

REJECT NOW:

- implementing all future roles at once
- adding a heavy external policy engine without demonstrated need
- building a second fleet-specific delivery engine
- allowing AI prompt text to act as authorization
- activating KYC/AML for ordinary users without legal/business need
- building marketplace/escrow during Identity foundation work
- directly exposing PII to AI
- trusting frontend role/permission state
- mixing workshop, marketplace, AI or vehicle logic into authentication code
- weakening evidence fail-closed behavior for convenience

## 28. Success Criteria for Foundation Architecture

The foundation is successful only if:

- responsibilities remain separated
- authorization is server-side
- tenant isolation is testable
- PII handling is explicit
- audit events correlate across modules
- rate limiting is consistent
- feature states are authoritative
- messaging does not duplicate delivery engines
- premium cannot bypass safety
- AI cannot gain hidden authority
- frozen evidence and vehicle boundaries remain unchanged
- future modules can integrate without rewriting the core

## 29. Deployment Rule

No account/authentication implementation goes directly to public production.

Required progression:

SPEC
→ REVIEW
→ FROZEN IMPLEMENTATION PLAN
→ SEPARATE IMPLEMENTATION BRANCH
→ UNIT TESTS
→ SECURITY TESTS
→ PRIVACY TESTS
→ AUTHORIZATION TESTS
→ TENANT-ISOLATION TESTS
→ LOCAL/STAGING VALIDATION
→ REGRESSION
→ USER REVIEW
→ CONTROLLED MERGE
→ PUBLIC ACTIVATION

## 30. Current Boundary

This resolution changes no frozen V0.1 content.

It does not:

- create accounts
- collect emails
- activate login
- send broadcasts
- activate billing
- activate professional networking
- activate marketplace
- activate escrow
- alter AI permissions
- alter vehicle permissions
- alter scientific evidence

Any implementation requires a separately reviewed gate.
