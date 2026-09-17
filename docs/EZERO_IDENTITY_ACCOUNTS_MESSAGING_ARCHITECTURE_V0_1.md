# E-ZERO Identity, Accounts & Messaging Architecture V0.1

Status: PREREGISTRATION / ARCHITECTURE SPECIFICATION
Version: 0.1
Implementation Status: NOT IMPLEMENTED
Public Activation: NOT AUTHORIZED BY THIS SPEC

## 1. Purpose

This specification defines a separate, secure identity, account, entitlement,
communication and notification architecture for E-ZERO.

The purpose is to allow users, companies, workshops and future partners to:

- create persistent E-ZERO accounts
- verify ownership of an email address
- sign in securely
- retain approved preferences and account state
- receive account and system notifications
- receive permitted product/service announcements
- access features according to role and entitlement
- use future premium or paid E-ZERO services
- receive targeted communications appropriate to their role, plan or feature use

This specification does not activate authentication, billing or messaging.

## 2. Architectural Separation

The Identity system MUST remain separate from:

- E-ZERO AI Agent
- Null Bench
- Evidence Registry
- Voice Guide
- Vehicle / OBD systems
- Industrial machinery modules
- Visual Assistant & Workshop Guide
- Marketplace / broker functions
- payments / escrow
- cybersecurity modules
- scientific validation systems

Integration MUST occur only through explicit, versioned interfaces.

No module may silently read or modify another module's private state.

## 3. Core Engineering Rule

One module = one responsibility.

Authentication must not contain billing logic.

Billing must not contain AI logic.

Messaging must not become an evidence authority.

The AI Agent must not become an identity authority.

Public UI must not become a source of account authorization.

Vehicle or machinery systems must not receive permissions from the AI Agent.

## 4. Initial Account Types

The architecture SHALL support future roles including:

- individual user
- vehicle owner
- family / shared vehicle member
- driver
- workshop user
- technician
- inspector
- fleet member
- fleet manager
- company administrator
- dealer
- supplier
- marketplace buyer
- marketplace seller
- broker
- support agent
- verifier
- read-only viewer

Roles MUST be permission-scoped.

Role assignment MUST NOT automatically grant premium entitlement.

Entitlement MUST NOT automatically grant administrative permission.

## 5. Email-Based Identity

Initial identity capability should support verified email ownership.

Recommended supported authentication methods:

- passwordless magic link
- one-time email code
- secure password authentication if later required
- passkeys as a future extension
- MFA as a future extension for sensitive roles

Email ownership MUST be verified before sensitive account capabilities are enabled.

Raw email addresses MUST NOT be exposed publicly.

Raw email addresses MUST NOT be included in public analytics,
evidence bundles, AI prompts or public logs.

## 6. Session Security

Sessions MUST:

- use secure server-generated identifiers
- use HTTPS only
- support expiration
- support explicit logout
- support revocation
- support device/session review in future
- avoid storing secrets in frontend JavaScript
- avoid placing authentication tokens in public URLs

Sensitive session state MUST remain server-side or use appropriately protected tokens.

## 7. Account Recovery

The architecture MUST support:

- verified account recovery
- expired-link handling
- recovery rate limiting
- protection against account enumeration
- recovery audit logging
- security notification after important account changes

## 8. User Profile Boundary

A profile may contain only necessary service information.

Possible fields include:

- user_id
- verified_email status
- display name
- preferred language
- country / region
- timezone
- role memberships
- plan / entitlement references
- notification preferences
- consent status
- account creation time
- account security metadata

Sensitive information MUST be minimized.

## 9. Subscription and Entitlement Layer

Premium access MUST be handled through a separate entitlement service.

Identity may know:

- FREE
- PREMIUM
- BUSINESS
- WORKSHOP
- FLEET
- other future plan identifiers

Identity MUST NOT directly process payment cards.

Payment providers must communicate verified entitlement events
through a separate billing / entitlement interface.

A successful payment event does not directly modify scientific evidence
or vehicle permissions.

## 10. Feature Entitlements

Future feature access may be controlled by entitlement, role and safety gates.

Examples:

- AI usage limits
- advanced report generation
- workshop tools
- Visual Assistant usage
- premium market intelligence
- fleet functions
- saved vehicles
- extended history
- business dashboards
- advanced analytics

A premium plan MUST NOT bypass:

- safety rules
- evidence rules
- legal rules
- role restrictions
- vehicle read-only boundaries
- high-risk repair gates

## 11. Messaging Architecture

Messaging SHALL be a separate module.

Supported future communication classes:

### 11.1 Transactional
Examples:

- email verification
- sign-in confirmation
- password / recovery notice
- subscription receipt
- important account change
- service booking confirmation

### 11.2 Product / System Updates
Examples:

- E-ZERO feature update
- important maintenance notice
- module availability update
- planned service interruption

### 11.3 User-Selected Notifications
Examples:

- workshop reminder
- vehicle service reminder
- saved search alert
- marketplace update
- report availability

### 11.4 Promotional Communication
Promotional or marketing communication MUST follow applicable consent rules
and support unsubscribe / opt-out.

Transactional and security-critical messages MUST remain separate from marketing.

## 12. Broadcast and Segmentation

Authorized administrators may later send messages to approved segments such as:

- all users
- premium users
- free users
- workshop users
- fleet managers
- specific companies
- users of a specific module
- users in a specific supported region
- users who opted into a category

Broadcast selection MUST be server-side and permission-checked.

The AI Agent MUST NOT independently create or send mass broadcasts.

Every administrative broadcast MUST be auditable.

## 13. Notification Preferences

Users should be able to control permitted categories.

Possible channels:

- email
- in-app notifications
- future push notifications
- future SMS where appropriate

Users should be able to:

- enable / disable optional notifications
- choose language
- choose categories
- unsubscribe from marketing
- retain required security notifications

## 14. Privacy and Consent

The system MUST support:

- clear consent records
- privacy notice version
- purpose limitation
- data minimization
- user-access request capability
- data correction
- account deletion workflow
- data export workflow where required
- retention policy
- regional compliance adapters

Consent MUST NOT be inferred merely from account creation where explicit consent
is legally or operationally required.

## 15. AI Agent Privacy Boundary

The E-ZERO AI Agent MUST NOT receive raw user email addresses by default.

The Agent may receive only minimum necessary account context such as:

- authenticated: true / false
- role category
- entitlement category
- selected language
- permitted feature availability

The Agent MUST NOT:

- reveal another user's data
- search private account databases without an authorized interface
- change account permissions
- change subscription status
- send messages without an explicit authorized workflow
- expose authentication secrets

## 16. Auditability

The system MUST create audit records for sensitive actions including:

- role changes
- entitlement changes
- administrative broadcasts
- account recovery
- important security events
- consent changes
- administrative account actions

Audit records MUST avoid storing secrets.

Audit records must have timestamps and actor identity.

## 17. Administrative Controls

Future administration should support:

- user status review
- role assignment
- entitlement review
- broadcast creation
- broadcast preview
- segmented recipient count
- send confirmation gate
- audit history
- abuse handling
- account suspension with documented reason
- support ticket linkage

High-impact administrative actions SHOULD require stronger authentication.

## 18. Anti-Abuse and Security Controls

The architecture MUST allow:

- rate limiting
- bot protection
- email abuse prevention
- brute-force protection
- suspicious login detection
- session revocation
- account lock / review
- abuse reporting
- server-side authorization checks

Frontend visibility MUST NOT be treated as authorization.

## 19. Regional Architecture

E-ZERO is intended to support multiple countries.

Regional adapters may later define:

- privacy requirements
- consent requirements
- data retention
- communication rules
- billing requirements
- tax treatment
- currency display
- permitted identity methods
- marketplace requirements

No single hard-coded regional rule should be assumed globally.

## 20. Business and Company Accounts

Future company accounts may support:

- organization_id
- company owner
- administrators
- managers
- staff
- drivers
- technicians
- viewers
- departments
- fleet membership
- workshop membership

Company data MUST remain isolated between organizations.

A user may have multiple memberships with different permissions.

## 21. Public / Customer Convenience

The account system should support future user conveniences such as:

- saved preferences
- saved vehicles
- service history references
- saved reports
- notification history
- support requests
- workshop bookings
- marketplace activity
- subscription history
- invoices
- language preference
- accessibility preference

Each capability must remain in its own domain module.

## 22. Visual Assistant Integration Boundary

The future Visual Assistant & Workshop Guide SHALL remain a separate module.

Identity may provide only:

- authenticated user ID
- role
- entitlement
- permitted usage level
- consent state

The Visual Assistant MUST NOT gain access to unrelated private account data.

Uploaded images/video/audio require their own:

- consent
- retention
- privacy
- deletion
- access-control rules

## 23. Workshop Integration Boundary

Workshop features may later support:

- workshop account
- technician roles
- bookings
- quotations
- job status
- parts requests
- inspection reports
- service history
- customer communication

Workshop access MUST NOT grant unrestricted access to customer data.

## 24. Marketplace Future Boundary

Future marketplace features may include:

- vehicle listings
- buyer / seller accounts
- offers
- negotiation
- document verification
- inspection requests
- valuation
- broker workflows

Identity provides authorization only.

Marketplace logic remains separate.

## 25. Payment and Escrow Boundary

E-ZERO authentication MUST NOT directly custody money.

Future payments and escrow SHOULD integrate with licensed external providers.

Possible future flows:

- subscription payment
- workshop payment
- marketplace deposit
- escrow hold
- verification gate
- release
- refund
- dispute

Payment status may update entitlement or transaction status
through signed / verified server-side events.

## 26. Financial and Compliance Separation

Future regulated workflows may require:

- KYC
- AML
- sanctions screening
- fraud checks
- transaction monitoring
- tax / fee calculation
- dispute management

These capabilities MUST be separate compliance modules.

The AI Agent MUST NOT override their decisions.

## 27. No Vehicle or Machinery Control

Account state MUST NEVER grant the AI Agent direct ability to:

- write ECU data
- clear DTCs
- flash firmware
- program modules
- activate actuators
- alter sensors
- alter machinery controls
- modify PLC logic
- control safety systems

Vehicle and machinery boundaries remain independently governed.

## 28. Failure Behaviour

Authentication or messaging failure MUST NOT break:

- Null Bench
- public evidence pages
- static public research content
- safety notices

Sensitive paths should fail closed.

No login failure may silently downgrade security.

## 29. API Design Principles

Future identity APIs MUST:

- be versioned
- validate schemas
- use HTTPS
- authenticate server-side
- authorize every sensitive action
- use bounded inputs
- provide deterministic error states
- avoid leaking internal details

## 30. Data Model Versioning

Account schema changes MUST be versioned.

Migrations MUST be:

- reviewable
- reversible where practical
- tested
- logged
- backed up before destructive migration

## 31. Testing Requirements

Before public activation, minimum tests should include:

- email verification
- invalid verification token
- expired token
- account enumeration resistance
- session creation
- session expiry
- logout
- session revocation
- unauthorized access
- cross-user isolation
- cross-company isolation
- role enforcement
- entitlement enforcement
- premium cannot bypass safety
- notification preference enforcement
- marketing opt-out
- broadcast permission
- broadcast segmentation
- audit log generation
- recovery flow
- API rate limiting
- AI privacy boundary
- failure / outage fallback

Regression tests MUST run before deployment.

## 32. Deployment Discipline

Required workflow:

SPEC
→ REVIEW
→ FROZEN SPEC
→ IMPLEMENTATION BRANCH
→ TESTS
→ SECURITY REVIEW
→ LOCAL / STAGING VALIDATION
→ REGRESSION
→ USER-FACING REVIEW
→ CONTROLLED MERGE
→ PUBLIC ACTIVATION

No unverified identity change may be pushed directly to production.

## 33. Evidence Boundary

Authentication success is not scientific evidence.

Premium status is not scientific evidence.

User identity is not scientific evidence.

Messaging is not scientific evidence.

No identity/account module may edit:

- evidence registry
- raw sensor evidence
- validation results
- frozen scientific claims

## 34. Future Extension Capacity

The architecture SHALL reserve interfaces for future:

- AI Agent personalization
- workshop systems
- Visual Assistant
- vehicle marketplace
- spare-parts marketplace
- vehicle pricing
- insurance
- finance
- logistics
- licensed escrow
- company / fleet services
- cybersecurity services
- industrial services
- telecom / infrastructure modules

These remain inactive until separately specified and reviewed.

## 35. Current Boundary

This V0.1 document defines architecture only.

It does NOT:

- create user accounts
- collect email addresses
- send email
- activate login
- activate premium plans
- process payment
- enable marketplace functions
- enable escrow
- grant vehicle access
- change AI Agent permissions

Any implementation requires a separate reviewed implementation gate.
