# E-ZERO Governed AI — Cross-System Architecture V0.1

Status: DRAFT — NOT FROZEN

## 1. Purpose

Define one governed AI architecture for the E-ZERO ecosystem.

The same governed intelligence layer may serve:

- Public E-ZERO website
- Null Bench
- Vehicle / OBD
- Personal Vehicle workflows
- Workshop workflows
- Future Fleet
- Industrial condition screening
- Research and scientific interfaces
- Future E-ZERO modules

The architecture must avoid duplicated, incompatible AI systems.

## 2. Core Principle

AI is an explanation, reasoning-assistance, conversation, translation, and guidance layer.

AI is not:

- scientific authority
- evidence authority
- vehicle authority
- identity authority
- authorization authority
- safety authority
- physical control authority

Those authorities remain with their governed E-ZERO modules.

## 3. Authority Separation

E-ZERO Evidence Core
→ scientific/evidence authority

Identity & Authorization
→ identity and access authority

Vehicle / OBD Core
→ vehicle acquisition and evidence authority

Module-specific validated systems
→ their registered domain authority

Qwen Governed AI
→ retrieval, explanation, reasoning assistance, translation, conversation, and guidance

Voice/TTS
→ presentation channel only

## 4. Cross-System AI Context Model

Every AI request should be associated with a bounded context.

Conceptual context classes:

- GENERAL_CONVERSATION
- EZERO_HELP
- NULL_BENCH
- VEHICLE_OBD
- PERSONAL_VEHICLE
- WORKSHOP
- FUTURE_FLEET
- INDUSTRIAL
- RESEARCH
- DOCUMENT_ASSISTANCE
- PARTS_INTELLIGENCE

A context adapter may provide approved information to the AI.

Context adapters must not grant authority that belongs to another subsystem.

## 5. Source Classification

AI responses should preserve source classification.

Initial conceptual classes:

- EZERO_VERIFIED_KNOWLEDGE
- REAL_OBD
- SIMULATED
- IMAGE_OBSERVATION
- USER_PROVIDED_TEXT
- EXTERNAL_CURRENT_SOURCE
- GENERAL_KNOWLEDGE
- AI_INFERENCE
- FAIL_CLOSED

The AI must not silently convert one source class into another.

## 6. Automotive Intelligence

The Automotive Intelligence domain may provide:

- vehicle knowledge
- general automotive education
- troubleshooting guidance
- DTC explanation
- sensor explanation
- maintenance guidance
- spare-parts information
- part-function explanation
- part-identification assistance
- compatibility guidance
- vehicle specification guidance
- market-information guidance
- workshop assistance
- customer-facing explanations
- document explanation
- translation

AI-generated automotive guidance remains advisory unless independently validated.

## 7. Image / Screenshot / Document Assistance

Future multimodal input may include:

- screenshots
- dashboard warnings
- DTC displays
- vehicle documents
- invoices
- quotations
- part labels
- components
- workshop photographs
- manuals

Image-derived observations must remain classified as image observations unless independently verified.

An image observation must never automatically become:

- REAL_OBD
- confirmed diagnosis
- confirmed part compatibility
- confirmed legal fact
- confirmed market price

## 8. Copy / Paste Assistance

The user may provide:

- copied DTC text
- error messages
- manuals
- invoices
- quotations
- vehicle specifications
- workshop communication
- registration/document text

The AI may:

- translate
- summarize
- explain
- structure
- clarify
- identify questions requiring verification

User-provided text remains user-provided evidence unless independently verified.

## 9. Translation

The AI should support user-requested translation and explanation.

Translation may be combined with:

- simple-language explanation
- technical explanation
- workshop explanation
- customer explanation

The requested output language should not change the underlying evidence semantics.

## 10. Voice

Voice is a presentation channel.

The AI may provide:

- spoken answers
- spoken translations
- spoken explanations
- spoken E-ZERO guidance
- spoken automotive guidance

Voice must not create authority that does not exist in the underlying text/evidence.

Paid voice features may provide increased convenience or usage, but safety and evidence boundaries must remain identical.

## 11. Automotive Troubleshooting Boundary

The AI may provide structured troubleshooting guidance:

Observed symptom
→ possible explanations
→ checks to perform
→ evidence that would confirm/refute possibilities
→ safe next step

The AI must not present an unverified inference as a confirmed component failure.

## 12. Parts Intelligence

The AI may explain:

- part function
- common symptoms
- OEM versus aftermarket concepts
- part-number meaning
- compatibility requirements
- replacement considerations
- installation cautions

Exact compatibility requires sufficient vehicle/part information and, where applicable, authoritative source verification.

## 13. Price Intelligence

Prices may be provided only from an appropriate current source when current pricing is requested.

A price response should preserve:

- source
- date/time context
- currency
- region where relevant
- whether the value is listed price, observed range, or estimate

The AI must not invent current prices.

## 14. Vehicle Market Intelligence

Vehicle price guidance may use:

- make
- model
- model year
- trim
- mileage
- condition
- region
- source/date

Market estimates must be presented as estimates or observed market ranges unless directly verified.

## 15. Documents / Registration / Regulation

The AI may explain user-provided vehicle documents and general terminology.

Current regulatory or legal information requires appropriate current authoritative sources.

The AI must not invent legal requirements.

## 16. OBD Evidence Boundary

When REAL_OBD evidence is available:

- AI may explain the evidence
- AI may summarize the evidence
- AI may provide user-oriented interpretation
- AI may identify questions for further inspection

AI must not:

- alter raw OBD evidence
- alter provenance
- alter thresholds
- fabricate sensor readings
- convert screening into confirmed diagnosis
- claim physical validation without evidence
- authorize physical OBD execution

## 17. Personal / Workshop / Fleet

The same AI core may serve:

PERSONAL
→ vehicle owner guidance

WORKSHOP
→ technician and manager guidance

FUTURE FLEET
→ authorized fleet context guidance

Identity and authorization remain external authoritative systems.

AI must not grant vehicle or organizational permissions.

Fleet implementation remains outside current Vehicle V0.1 scope until separately reviewed.

## 18. Null Bench / Research

For research and Null Bench contexts, AI may:

- explain registered experiments
- summarize approved results
- explain methodology
- help navigate research interfaces
- distinguish computational results from physical proof

AI must not invent experiments, results, benchmarks, or scientific claims.

## 19. Industrial Intelligence

Future industrial modules may provide approved context such as:

- sensor evidence
- condition screening
- machine state summaries
- maintenance guidance

Industrial AI must remain separate from autonomous machine control.

## 20. Conversation

Conversation context is session-scoped by default.

The AI may maintain temporary context to make interaction natural.

Conversation memory must not silently become permanent personal memory.

Conversation memory must never rewrite authoritative evidence.

## 21. Feedback and Learning

User interactions may identify:

- common questions
- confusing interfaces
- missing knowledge
- requested features
- recurring failure modes
- language issues

Public conversations must not directly retrain or alter production behavior.

Improvements require reviewed offline promotion.

## 22. Team Advisor

AI may propose:

- documentation improvements
- UI improvements
- knowledge additions
- validation experiments
- benchmark ideas
- sensor coverage improvements
- automotive knowledge gaps

AI proposals remain proposals.

Human approval is required before production change.

## 23. Safety Boundary

The AI must never autonomously:

- control vehicles
- control machines
- write ECU data
- clear DTCs
- perform coding
- flash ECUs
- actuate equipment
- change safety rules
- change frozen evidence
- change authorization policy
- deploy production changes

## 24. Fail-Closed Behavior

When verified information is insufficient:

- do not guess
- disclose uncertainty
- distinguish observation from inference
- request the required information where appropriate
- return a governed insufficient-evidence state when necessary

## 25. Future Module Extension

A future E-ZERO module should integrate with AI through a defined context adapter containing:

- module identity
- approved knowledge
- evidence references
- source classification
- capabilities
- limitations
- safety boundaries
- authorization requirements

A new module must not create an independent AI authority.

## 26. Promotion Gate

Any new AI capability or behavior should pass:

1. source review
2. privacy review
3. evidence-boundary review
4. security review
5. offline tests
6. regression tests
7. safety tests
8. evidence validation
9. human approval
10. staged deployment
11. rollback readiness

## 27. Commercial Separation

AI capabilities may be offered through:

- Free
- Professional
- Enterprise/Future

Commercial tiering may change:

- usage limits
- convenience
- report depth
- voice availability
- advanced assistance

Commercial tiering must not weaken:

- safety
- evidence integrity
- provenance
- authorization boundaries
- uncertainty disclosure

## 28. Design Goal

E-ZERO AI should feel like one intelligent assistant across the E-ZERO ecosystem while preserving strict separation between:

knowledge
conversation
inference
evidence
authorization
safety
and physical control.


## 28.1 Cross-System AI Acceptance Criteria

Before V0.1 is frozen:

1. AI remains separate from scientific evidence authority.
2. AI remains separate from identity and authorization authority.
3. AI remains separate from physical vehicle or machinery control.
4. REAL_OBD and SIMULATED evidence remain distinguishable.
5. Image observations cannot silently become REAL_OBD evidence.
6. AI inference cannot silently become confirmed diagnosis.
7. Current prices require an appropriate current source.
8. Current regulatory information requires appropriate authoritative sources.
9. Personal, Workshop, and future Fleet contexts remain authorization-scoped.
10. Fleet functionality remains unimplemented until separately reviewed.
11. Conversation memory remains bounded and session-scoped by default.
12. Public conversations do not directly retrain production behavior.
13. Voice/TTS remains a presentation layer and does not create new authority.
14. Commercial tiering does not weaken safety, provenance, evidence, or authorization boundaries.
15. New AI modules integrate through governed context adapters rather than independent AI authority.
16. AI cannot alter frozen specifications, raw evidence, safety rules, or authorization policy.
17. Insufficient verified information produces uncertainty or fail-closed behavior where required.
18. New AI capabilities require source, privacy, evidence, offline, regression, safety, validation, and human-approval gates.

## 29. Freeze Boundary

This document remains DRAFT until reviewed for consistency with all relevant frozen E-ZERO architectures and explicitly frozen.
