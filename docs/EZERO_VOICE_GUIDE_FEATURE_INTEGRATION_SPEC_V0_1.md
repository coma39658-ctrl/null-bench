# E-ZERO Voice Guide — Full Feature Integration Specification v0.1

STATUS = DEVELOPMENT_SPEC
VOICE_GUIDE_ROLE = INFORMATIONAL_SUPPORT
SCIENTIFIC_AUTHORITY = FALSE
DIAGNOSTIC_AUTHORITY = FALSE
AUTONOMOUS_CONTROL = FALSE
SAFETY_SHIELD_OVERRIDE = FALSE
SELF_MODIFYING_EVIDENCE = FALSE

## 1. Purpose

The E-ZERO Voice Guide shall act as a multilingual, evidence-grounded support layer across the public E-ZERO website.

It shall help users understand:
- website sections
- buttons and controls
- supported inputs
- outputs and result meanings
- registered PASS / FAIL / PARTIAL / UNKNOWN states
- validation boundaries
- common runtime and input errors
- reasons a result or workflow stopped
- available next safe actions

The Voice Guide shall not replace any E-ZERO scientific, diagnostic, safety, control, validation, or evidence module.

## 2. Supported User Languages

Primary:
- English
- Urdu
- Roman Urdu

The guide should normalize common Roman Urdu phrasing and respond in the user's active/requested language where possible.

## 3. Website Feature Coverage

The guide shall include registered explanations for:
- Null Bench
- Benchmark 006 / 006-C
- Vehicle / OBD
- Industrial Intelligence
- Fleet / Shared Access
- Evidence Governance
- Adaptive Decision Lab
- Dashboard/result areas
- public controls and navigation
- supported data/input formats
- limitations and provenance

Each feature shall retain its original system role and authority.

## 4. Context-Aware Assistance

The guide should be able to answer:
- What is this section?
- What does this button do?
- What input is required?
- Why did this result appear?
- Why did this test stop?
- Why was my data rejected?
- What does this status mean?
- What can I safely do next?
- Where can I find a specific feature?

Where possible, answers should be derived from:
1. registered evidence
2. registered feature metadata
3. registered error/status mappings
4. current visible website context

If verified information is unavailable:
UNKNOWN / UNVERIFIED / REVIEW REQUIRED

## 5. Result Explanation Layer

The guide may explain registered result fields and statuses.

It must distinguish:
- computational output
- statistical evidence
- simulated/synthetic result
- replay result
- real sensor data
- physical validation
- diagnostic validation
- safety certification

The guide must not convert one category into another.

## 6. Error Explanation Layer

Registered errors/statuses should have:
- machine-readable code
- user-friendly English explanation
- user-friendly Urdu explanation
- likely cause
- safe next step
- evidence/source reference where applicable

Examples include:
- INVALID_INPUT
- MISSING_REQUIRED_FIELD
- UNSUPPORTED_FORMAT
- NON_FINITE_VALUE
- NO_RESULT
- TEST_STOPPED
- DATA_UNAVAILABLE
- READ_TIMEOUT
- ADAPTER_ERROR
- ECU_NO_RESPONSE
- INVALID_RESPONSE
- UNSUPPORTED_BY_VEHICLE
- NOT_QUERIED

Unknown errors must not be guessed.

## 7. Vehicle / OBD Status Rules

The guide shall preserve distinct statuses:
- SUPPORTED
- UNSUPPORTED_BY_VEHICLE
- READ_TIMEOUT
- ADAPTER_ERROR
- ECU_NO_RESPONSE
- INVALID_RESPONSE
- NOT_QUERIED

These statuses must not be collapsed into generic success/failure wording.

## 8. Condition Status Presentation

Where registered thresholds exist:

GREEN:
registered normal/acceptable state

AMBER:
registered intermediate/caution state

RED:
registered high/critical risk state

UNKNOWN / DATA UNAVAILABLE / REVIEW REQUIRED:
missing, invalid, stale, unsupported, contradictory, or insufficient data

Missing or invalid data must never be shown as GREEN.

Condition status does not equal definitive diagnosis or safety certification.

## 9. Voice Interaction

Voice input:
- browser speech recognition where supported
- text fallback always available

Voice output:
- browser speech synthesis where supported
- text answer always preserved

Speech is presentation only and is not evidence.

## 10. Navigation Assistance

The guide may direct or scroll the user to registered website sections.

It shall not:
- change scientific settings silently
- submit unsafe operations
- control vehicles or machines
- modify evidence
- activate autonomous functions

## 11. Fail-Closed Rules

The guide must fail closed when:
- evidence is missing
- question is outside registered scope
- result provenance is unknown
- status mapping is unavailable
- data is contradictory
- feature behavior cannot be verified

Approved fallback:
"I do not have verified E-ZERO information for that yet."

Urdu:
"میرے پاس اس بارے میں ابھی verified E-ZERO information موجود نہیں ہے۔"

## 12. AI / LLM Boundary

A future AI/LLM layer may:
- understand natural language
- normalize Roman Urdu
- paraphrase registered explanations
- assist navigation
- summarize verified evidence

It must not:
- create scientific evidence
- change thresholds
- fabricate results
- diagnose unsupported faults
- override deterministic safety logic
- modify the evidence registry automatically

Registered E-ZERO evidence remains the authority.

## 13. Controlled Improvement

User questions that are not covered may be logged as candidate knowledge.

Candidate knowledge must:
- remain separate from production verified knowledge
- be reviewed
- have provenance
- pass validation
- be versioned before activation

No automatic self-learning into production claims.

## 14. Required Engineering Components

Future implementation should maintain separate files/modules for:
- feature registry
- knowledge registry
- error/status registry
- language normalization
- result explainer
- page-context detector
- navigation helper
- speech input
- speech output
- optional AI adapter
- validation tests

## 15. Core Principle

Do not assume the answer.
Use registered E-ZERO evidence.
If evidence is insufficient, say so.
