# E-ZERO Public Website Information Architecture Specification V0.1

Status: DRAFT / NOT FROZEN / NO IMPLEMENTATION AUTHORIZATION

## 1. Purpose

Define a single reusable public information architecture for the E-ZERO platform.

The purpose is to make E-ZERO understandable to non-expert visitors while
preserving full evidence, limitations, validation history, and scientific
claims boundaries for technical reviewers.

This specification governs presentation structure only.

It does NOT change:

- evidence registry schema
- validator logic
- benchmark criteria
- frozen scientific claims
- module functionality
- validation outcomes

## 2. Non-Goals

This specification is NOT:

- a rebrand
- a Null Bench spin-off decision
- a pricing specification
- a scientific claims rewrite
- a benchmark rewrite
- an evidence deletion plan
- an authorization for live GPS or physical deployment

E-ZERO remains the platform identity.

## 3. Binding Governance Constraints

### 3.1 Platform Identity

E-ZERO remains the primary platform identity.

Null Bench may be presented as a Featured Live Tool but does not replace
the E-ZERO platform identity.

### 3.2 Evidence Preservation

Evidence is relocated, never silently deleted.

Existing public:

- PASS/FAIL results
- test counts
- commits
- tags
- validation logs
- limitations
- claims boundaries

must remain accessible after restructuring.

### 3.3 Status Honesty

Public presentation must never imply a stronger validation state than the
underlying evidence supports.

Software validation must not be presented as physical validation.

Simulation must not be presented as real-world evidence.

Fleet software validation must not be presented as live GPS field validation.

### 3.4 Frozen Evidence Integrity

Existing frozen commits, tags, evidence records, validation logs and claims
boundaries must not be silently rewritten during website restructuring.

## 4. Audience Layers

### L1 — General Visitor

Needs:

- what E-ZERO is
- what each module does
- what is usable now
- what is not yet validated

### L2 — Practitioner

Needs:

- module scope
- current usable capability
- setup/use guidance
- current limitations

### L3 — Technical Reviewer

Needs:

- evidence status
- commits
- tags
- test counts
- validation logs
- methodology
- claims boundary
- limitations

The L1 answer must be understandable without specialist terminology.

## 5. Navigation Architecture

The platform landing page should expose four primary modules:

1. Null Bench
2. Vehicle / OBD Intelligence
3. Industrial Intelligence
4. Fleet & Shared Access

Existing public anchors must remain functional during V0.1 migration,
including at minimum:

- #try
- #vehicle-obd
- #industrial-intelligence
- #fleet-shared-access
- #support
- #evidence

Dedicated module paths may be introduced later under a separate reviewed
migration step.

## 6. Hero Contract

The hero must:

- state what E-ZERO is in plain language
- avoid benchmark/test-count overload
- avoid unexplained acronyms
- identify E-ZERO as the platform
- provide a clear primary action

Suggested plain-language statement:

"E-ZERO provides evidence-first tools for testing, screening, and validating
network, vehicle, industrial, and fleet data."

Null Bench may be shown as:

`Featured Live Tool`

with:

`Run a Free Test`

as a primary action.

## 7. Module Card Contract

Each primary module card must contain:

1. module name
2. one plain-language benefit statement
3. a controlled status area
4. one primary action

The status area may contain one or more approved public presentation badges
when necessary to prevent ambiguity.

Example for Fleet:

`Software Validated`
+
`Live GPS Pending`

Module cards must not be dominated by:

- commit hashes
- tags
- regression numbers
- benchmark names
- large PASS/FAIL tables

Those belong to the technical evidence layer.

## 8. Module Page / Section Contract

Each module follows this order:

### Layer 1 — Human Overview

Show:

- what it does
- who it is for
- current public capability
- what it does not establish

### Layer 2 — Use / Current Capability

Where a real public interactive tool already exists, show it here.

Examples:

- Null Bench run panel
- OBD simulation

Where no public interactive implementation exists yet, show:

`Current Public Capability / Software Validation Preview`

instead of implying an interactive feature exists.

Fleet 500+ search must currently be described as a software-validated
capability, not as a public live fleet database search interface.

### Layer 3 — Technical Evidence & Validation

Collapsed by default.

May contain:

- evidence status
- dedicated test counts
- full regression counts
- registry reference
- public commit references
- public tags
- validation logs
- detailed limitations
- claims evidence

## 9. Progressive Disclosure

Technical evidence may be visually collapsed by default.

Where practical, intentionally public evidence should remain present in the
initial HTML/DOM for accessibility and traceability.

Search-engine indexing of collapsed content is NOT guaranteed.

Preferred implementation should use accessible disclosure patterns such as
native `<details>` / `<summary>` where appropriate.

Collapsed content must NEVER expose:

- passwords
- tokens
- credentials
- private account identifiers
- private member identities
- precise private vehicle locations
- non-public infrastructure secrets

Only intentionally public evidence may be included.

Deep links to evidence should open or reveal the relevant evidence item where
technically practical.

## 10. Public Presentation Status Vocabulary

These are public-facing presentation badges.

### Live Tool

Meaning:

A public user-facing tool is currently usable.

This badge does NOT by itself imply:

- physical validation
- diagnostic accuracy
- safety certification
- real-world field validation

### Software Validated

Meaning:

The registered software implementation passed its stated software validation.

It must NOT be used alone to imply physical validation.

If later physical validation exists, software validation may remain true and be
shown alongside a separate physical/field-validation status.

### Simulation

Meaning:

The current public interaction uses simulated, synthetic, replayed, or mocked
data.

It must not be presented as real-world physical evidence.

### Development

Meaning:

The user-facing module is still under active development and does not yet meet
a completed release milestone for the capability being described.

### Field Validation Pending

Meaning:

Software preparation exists but controlled physical validation remains
incomplete.

### Live GPS Pending

Meaning:

Fleet/location software exists, but live GPS/tracker physical validation is not
yet established.

Whenever Fleet software capability is presented publicly before physical GPS
validation, `Live GPS Pending` must remain visible.

## 11. Evidence Registry Status / Result Vocabulary

Evidence-registry states remain separate from public presentation badges.

Examples include:

- CLOSED_FROZEN
- DEVELOPMENT

Evidence results include:

- PASS
- FAIL
- PARTIAL

These evidence states/results must not be silently converted into promotional
status labels.

FAIL evidence must remain FAIL.

PARTIAL must mean incomplete/partial evidence, not softened failure.

## 12. Claims Boundary Block

Every module must retain a visible claims-boundary section.

Claims boundaries must remain visible without requiring the visitor to open
technical evidence.

Examples:

- Null Bench: statistical evidence, not proof
- Vehicle/OBD: screening, not diagnosis
- Industrial: no diagnosis / no RUL claim
- Fleet: no vehicle control / no validated live GPS

Existing frozen claims meaning must be preserved.

## 13. Evidence Presentation Rules

Evidence Registry remains authoritative for scientific public claims.

A shared visual evidence format may be used across modules.

Each module should display only its relevant evidence entries.

Displayed commit/tag references must correspond to the actual evidence target.

Broken evidence links must not be silently replaced with fabricated or stale
references.

## 14. Global Evidence-Governance Strip

A compact trust section may state principles such as:

- Evidence-governed
- Limitations shown publicly
- PASS and FAIL preserved
- Simulation labeled as simulation
- Read-only where safety requires it
- Software evidence is not physical proof

This trust strip should not overwhelm the hero.

## 15. Demo / Visual Guidance

Each module may eventually have one concise visual demonstration.

Allowed:

- screenshot
- short screen recording
- lightweight GIF

The demo must show only existing capability.

It must not present pending:

- live GPS
- physical diagnostics
- RUL validation
- vehicle control
- machine control

as completed.

## 16. Social Proof

Only genuine, authorized testimonials or partner statements may be shown.

Forbidden:

- fabricated testimonials
- invented customers
- invented adoption counts
- unsupported partnership claims

## 17. Mobile UX and Accessibility

Requirements:

- mobile-first layout
- module cards stack cleanly
- touch-friendly actions
- no horizontal scrolling for core content
- readable typography
- status labels not dependent on color alone
- keyboard-operable disclosure controls where applicable
- expanded/collapsed state exposed to assistive technology
- claims boundaries visible in normal page flow

## 18. SEO and URL Rules

During the single-page anchor phase:

- section headings and stable IDs provide module identity
- one HTML document has one document-level `<title>`
- module-specific `<title>` values are NOT possible for individual anchor
  sections

If dedicated module paths are introduced later, those pages may receive:

- distinct `<title>`
- distinct meta description
- canonical URL

Existing anchors must remain compatible during migration.

## 19. Analytics and Privacy

This specification introduces no new tracking.

Public restructuring must not expose:

- precise vehicle location
- private fleet membership
- private member IDs
- authentication/session data
- secrets

Private owner/fleet applications require separate authentication/privacy
review.

## 20. Migration Compatibility

Migration must be incremental.

Current public release remains the rollback baseline.

Required migration order:

1. freeze this specification
2. preserve current release rollback point
3. simplify platform hero
4. add four module cards
5. migrate one module first
6. validate layout/evidence
7. migrate remaining modules incrementally
8. preserve anchors
9. run evidence validator
10. verify public links
11. verify mobile layout
12. commit and tag redesigned public release

No destructive big-bang rewrite is permitted.

## 21. Monetization Boundary

Pricing is deferred.

Initial priority:

clarity -> usable demo -> trust -> validated adoption -> monetization

Any paid tier requires a separate product/pricing specification.

## 22. Acceptance Tests Before Freeze

The specification may be frozen only after confirming:

1. E-ZERO remains the platform identity
2. Null Bench remains a featured module, not the entire platform
3. four primary modules are represented
4. every module has a plain-language benefit statement
5. module status area supports multiple controlled badges where needed
6. Fleet requires Software Validated + Live GPS Pending before physical GPS validation
7. public presentation statuses are separate from evidence-registry statuses/results
8. technical evidence remains available
9. evidence registry remains authoritative
10. existing frozen evidence is not rewritten
11. software validation remains distinct from physical validation
12. simulation remains distinctly labeled
13. precise private location is never rendered publicly
14. collapsed evidence exposes no private/security-sensitive data
15. collapsed evidence indexing is not guaranteed
16. claims boundaries remain visible without expansion
17. PASS and FAIL evidence remain preserved
18. #vehicle-obd remains functional
19. #industrial-intelligence remains functional
20. #fleet-shared-access remains functional
21. #support remains functional
22. #try remains functional
23. #evidence remains functional
24. existing WhatsApp Support remains accessible
25. public Vehicle/OBD section remains accessible
26. public Industrial section remains accessible
27. public Fleet section remains accessible
28. Null Bench remains runnable
29. Fleet 500+ search is described as software-validated capability, not a public live fleet database
30. Fleet never shows a bare Live/Active status before live GPS physical validation
31. single-page anchors do not claim separate module `<title>` metadata
32. evidence validator continues to PASS
33. git diff --check passes
34. no website restructuring implementation occurs before spec freeze

## 23. Non-Goals / Claims Boundary

This specification does not authorize:

- new scientific claims
- live GPS activation
- real vehicle control
- industrial machine control
- diagnosis
- RUL validation
- fabricated testimonials
- rewriting frozen evidence
- removing FAIL evidence
- changing validated module semantics

## 24. Next Gate

Required before FREEZE:

1. author review of Sections 3, 10/11 and 22
2. consistency check against current live website
3. verify all current public modules/anchors are accounted for
4. verify no private data is introduced by progressive disclosure

Only after those checks may this draft be committed as:

`Freeze E-ZERO Public Website Information Architecture Spec V0.1`

Suggested tag:

`ezero-website-ia-v0.1`

No website restructuring implementation is authorized before that freeze.

Freeze metadata:

Pre-registration-status: DRAFT
Freeze-commit: pending
Tag: pending
Criteria-modified-after-freeze: N/A

END OF DRAFT
