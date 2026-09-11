# E-ZERO Voice Guide — Qwen AI + TTS Integration Specification V0.1

STATUS = DEVELOPMENT_SPEC

PUBLIC_MIC_BASELINE = FROZEN_REFERENCE
BASELINE_COMMIT = 4ee3e3e

AI_ROLE = EXPLANATION_LAYER
AI_EVIDENCE_AUTHORITY = FALSE
AI_DIAGNOSTIC_AUTHORITY = FALSE
AI_CONTROL_AUTHORITY = FALSE

TTS_ROLE = PRESENTATION_LAYER
TTS_EVIDENCE_AUTHORITY = FALSE

## Architecture

Speech Input
→ Speech-to-Text
→ Verified E-ZERO Context
→ Qwen Explanation Layer
→ Deterministic Safety Validator
→ Final Governed Text
→ Text-to-Speech

## Qwen Boundary

Qwen may:
- explain verified E-ZERO information
- summarize registered evidence
- answer website navigation questions
- explain registered statuses and limitations
- respond in supported languages when reliable

Qwen must not:
- invent evidence
- invent thresholds
- invent validation results
- claim unsupported diagnosis
- claim safety certification
- claim physical validation without evidence
- control vehicles, machines, ECUs, PLCs, VFDs, or actuators
- modify the evidence registry
- override deterministic safety rules

## Safety Validator

All AI-generated answers must pass through a deterministic validator before public presentation.

If verified evidence is insufficient, final output must fail closed.

Canonical sentinel:

INSUFFICIENT_VERIFIED_EZERO_EVIDENCE

## TTS Boundary

TTS only speaks the final governed answer.

TTS must never:
- change scientific meaning
- create additional claims
- reinterpret risk status
- generate independent diagnosis

If speech output is unavailable, the text answer remains authoritative.

## Deployment Boundary

The current Qwen server is localhost-only.

A localhost service must not be treated as a public GitHub Pages backend.

Public AI deployment requires a separately reviewed backend/API boundary.

## Current Known Limitations

- Qwen2.5 1.5B Urdu generation quality is not yet reliable enough to serve as unrestricted authority.
- Browser/device TTS availability varies.
- Public AI backend is not yet deployed.
- Full AI validation has not been established.

## Preservation Rule

The existing public Voice Guide microphone workflow at commit 4ee3e3e must remain recoverable and must not be overwritten by experimental AI/TTS work.

