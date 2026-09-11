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

## 14. Learning and Improvement Architecture

The Qwen Public Agent may improve over time, but it MUST NOT perform
uncontrolled live self-training from public conversations.

Improvement is divided into separate layers:

### A. E-ZERO Knowledge Learning

The agent should be able to retrieve and use approved E-ZERO knowledge,
including:

- frozen specifications
- evidence registry
- validated benchmark summaries
- module capabilities and limitations
- approved technical documentation
- verified public reports
- approved sensor / OBD boundaries
- governance and safety rules

Retrieval does not change the scientific evidence itself.

### B. Session Learning

The agent may use recent conversation context to maintain a natural dialogue.

Session context MUST remain bounded and MUST NOT silently become permanent
personal memory.

### C. User Feedback Learning

User interactions may be used to identify:

- common questions
- confusing interface areas
- repeated unmet needs
- requested features
- recurring failure modes
- language and usability problems

Public conversations MUST NOT directly retrain or modify the production model.

Any data retained for improvement must follow explicit privacy,
consent, minimization, and review rules.

### D. Offline Improvement

Model, retrieval, prompt, tool, or knowledge improvements must happen through
a reviewed offline process.

A candidate improvement must be evaluated before production activation.

Production behaviour MUST NOT change itself solely because users repeatedly
asked for something.

## 15. E-ZERO Team Advisor

The Qwen Agent may generate improvement proposals for the E-ZERO team.

Examples:

- documentation improvements
- interface improvements
- missing knowledge areas
- requested capabilities
- recurring user problems
- potential validation experiments
- benchmark expansion suggestions
- possible sensor coverage improvements

Every proposal should include, where possible:

- observed reason
- supporting evidence or interaction pattern
- confidence
- expected benefit
- possible risk
- affected module
- recommended validation
- rollback consideration

Advisor output is a proposal, not an approved change.

## 16. Human Approval Boundary

The Qwen Agent MUST NOT autonomously:

- change scientific claims
- edit the evidence registry
- change thresholds
- change frozen specifications
- alter raw sensor evidence
- approve diagnostic claims
- deploy production code
- promote experimental modules
- change safety rules

All such changes require explicit human review and approval.

## 17. Learning Separation

The following systems remain separate:

E-ZERO Evidence Core
→ scientific authority

Qwen Knowledge Layer
→ retrieval and explanation

Conversation Layer
→ temporary dialogue context

Feedback Learning Layer
→ reviewed improvement signals

Team Advisor
→ recommendations only

Implementation / Deployment
→ human-approved process

Learning quality MUST NOT be represented as increased scientific evidence.

## 18. Improvement Promotion Gate

Before a learned or suggested improvement reaches production, it should pass:

1. source review
2. privacy review
3. evidence-boundary review
4. offline test
5. regression test
6. safety test
7. evidence validator
8. human approval
9. staged deployment
10. rollback readiness
