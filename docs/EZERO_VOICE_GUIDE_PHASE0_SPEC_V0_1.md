# E-ZERO Voice Guide — Phase 0 Specification V0.1

STATUS = DEVELOPMENT_SPEC
PUBLIC_WEBSITE_GUIDE = TRUE
VOICE_INPUT = TRUE
VOICE_OUTPUT = TRUE
URDU_ENGLISH = TRUE
AUTONOMOUS_CONTROL = FALSE
DIAGNOSTIC_AUTHORITY = FALSE
SELF_MODIFYING_PRODUCTION_KNOWLEDGE = FALSE
UNVERIFIED_CLAIMS_ALLOWED = FALSE

## Purpose

E-ZERO Voice Guide is a public website assistant that helps users understand
the E-ZERO website, its buttons, sections, tools, evidence, limitations,
and result meanings through text and voice interaction.

## Phase 0 Functions

1. Floating microphone / voice-guide button on the public website.
2. Accept supported browser speech input.
3. Support Urdu and English guidance.
4. Speak responses using browser text-to-speech where available.
5. Explain:
   - Website navigation
   - Buttons and controls
   - Null Bench
   - Benchmark 006-C
   - Vehicle Intelligence
   - Industrial Intelligence
   - Fleet functions
   - Evidence Registry
   - Adaptive Decision Lab
6. Explain result meaning only within registered evidence boundaries.
7. Use deterministic verified website knowledge as the primary authority.
8. If verified information is unavailable, explicitly say so.
9. Never invent scientific results, validation, diagnosis, certification,
   hardware capability, or autonomous-control capability.

## Accuracy Boundary

The system must not claim 100 percent universal accuracy.

For registered deterministic website-guide questions, the goal is:
- evidence-grounded answers,
- reproducible mappings,
- explicit uncertainty,
- fail-closed behavior for unsupported questions.

## Safety and Governance

The Voice Guide:
- cannot control vehicles, machines, ECU, PLC, VFD, or actuators;
- cannot override the E-ZERO Safety Shield;
- cannot create diagnostic claims;
- cannot convert synthetic evidence into physical proof;
- cannot change Evidence Registry claims by itself;
- cannot silently learn or publish new facts.

## Controlled Learning

Future improvement may use user questions and feedback as candidate knowledge.

Candidate knowledge must:
1. remain separate from production verified knowledge;
2. be reviewed before activation;
3. preserve provenance;
4. pass validation before publication.

No autonomous self-modification of scientific claims is permitted.

## Phase 0 Technical Direction

Public website:
- Browser speech recognition when available
- Browser speech synthesis when available
- Deterministic E-ZERO knowledge base
- Text fallback when microphone or speech services are unavailable

Future optional local/offline stack:
- Whisper.cpp for speech-to-text
- Qwen-class local language model
- Piper for speech output

These future components require separate validation before public activation.

## Evidence Principle

Do not assume the answer.
Use registered E-ZERO evidence.
If evidence is insufficient, say so.

