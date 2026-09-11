# E-ZERO Qwen Public Agent Gateway Specification V0.1

Status: FROZEN / PRE-IMPLEMENTATION
Branch: voice-guide-public-qwen-agent-v0.1

## 1. Purpose

Provide a public conversational AI layer for the E-ZERO Voice Guide.

Target interaction:

User Mic
→ Speech-to-Text
→ Verified local E-ZERO answer check
→ Qwen Agent when needed
→ Governed response
→ Screen answer
→ Urdu Aegis speech when Urdu is selected
→ Ready for next conversational turn

The intended experience is natural turn-by-turn human-style conversation.

## 2. Evidence Priority

The Qwen Agent MUST NOT override verified deterministic E-ZERO answers.

Priority order:

1. Frozen / verified E-ZERO evidence
2. Deterministic local Voice Guide knowledge
3. Governed Qwen response
4. Fail-closed response

AI output is interpretation, not evidence.

## 3. Public Endpoint Boundary

The public website MUST NEVER call:

- localhost
- 127.0.0.1
- private LAN addresses
- non-HTTPS AI endpoints

Only an explicitly configured HTTPS public gateway may be used.

Default state:

PUBLIC_AI_ENABLED = false

The agent may only be enabled after:

- HTTPS endpoint exists
- health check passes
- response schema validation passes
- public browser test passes
- evidence validator passes

## 4. Request Contract

POST /api/ezero-agent/v0.1/ask

Content-Type: application/json

Request:

{
  "question": "string",
  "response_language": "string",
  "answer_length": "short|normal|detailed",
  "session_id": "ephemeral-string",
  "history": [
    {
      "role": "user|assistant",
      "content": "string"
    }
  ]
}

## 5. Conversation Memory

Conversation history is session-only by default.

Maximum history sent to the agent:

6 conversational turns.

The frontend MUST NOT silently create permanent personal memory.

Raw sensor evidence and diagnostic evidence MUST NOT be rewritten by conversational memory.

## 6. Response Contract

Successful response:

{
  "status": "OK",
  "answer": "string",
  "source_class": "GOVERNED_AI",
  "diagnostic_claim": false,
  "evidence_authority": false
}

Insufficient evidence:

{
  "status": "INSUFFICIENT_VERIFIED_EZERO_EVIDENCE",
  "answer": "",
  "source_class": "FAIL_CLOSED",
  "diagnostic_claim": false,
  "evidence_authority": false
}

## 7. Mandatory Safety Rules

The Qwen Agent MUST NOT:

- invent E-ZERO test results
- alter raw evidence
- alter thresholds
- alter module status
- claim physical validation without evidence
- claim diagnosis where only screening exists
- claim real-world sensor provenance for simulated data
- issue unsupported safety-critical instructions
- become the evidence authority

## 8. Voice Conversation

When Urdu is selected:

Qwen text response
→ E-ZERO Urdu Aegis TTS
→ automatic spoken response if Auto Speak is enabled

Aegis voice:

ur_PK-aegis_female-medium

Aegis is Urdu-only in V0.1.

Other languages continue using their configured browser/system speech path unless separately validated.

## 9. Conversational Turn Loop

V0.1 interaction:

LISTEN
→ THINKING
→ ANSWER
→ SPEAKING
→ READY

The microphone MUST NOT listen while Aegis is speaking.

After speech ends, the interface may return to READY.

Continuous always-on microphone mode is NOT enabled in V0.1.

## 10. Failure Behaviour

On timeout, invalid JSON, network failure, unavailable AI, unsafe response,
or schema mismatch:

FAIL CLOSED.

The existing verified deterministic Voice Guide remains available.

The website MUST continue functioning if the AI gateway is unavailable.

## 11. Separation of Responsibilities

Voice Guide:
presentation + interaction

Qwen Agent:
conversational interpretation

Aegis:
Urdu speech synthesis

Evidence Registry:
scientific/evidence authority

Sensor / OBD modules:
raw result producers

These responsibilities MUST remain separate.

## 12. Activation Gate

PUBLIC_AI_ENABLED may become true only after all of the following pass:

- HTTPS gateway reachable
- CORS restricted appropriately
- request/response schema validated
- no localhost dependency
- deterministic evidence priority preserved
- invalid-response fail-closed test
- AI-unavailable fallback test
- Urdu Aegis response test
- microphone turn-loop test
- evidence registry validator PASS
- public-device test

Until then:

PUBLIC_AI_ENABLED = false

## 13. Scientific Boundary

A fluent AI response does not increase evidence strength.

Conversational quality MUST remain separate from:

- scientific validation
- diagnostic certainty
- physical proof
- sensor provenance
- safety authority
