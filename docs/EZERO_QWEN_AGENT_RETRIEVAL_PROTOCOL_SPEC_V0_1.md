# E-ZERO Qwen Agent Retrieval Protocol Specification V0.1

Status: FROZEN / PRE-IMPLEMENTATION
Branch: voice-guide-public-qwen-agent-v0.1

## 1. Purpose

Define the safe connection between:

- E-ZERO browser retrieval
- Qwen Public Agent Gateway
- approved E-ZERO knowledge
- scientific evidence authority

This specification extends the frozen Qwen Public Agent Gateway V0.1
without changing its existing safety boundaries.

## 2. Trust Boundary

The public browser is NOT an evidence authority.

The gateway MUST NOT trust:

- browser-supplied evidence claims
- browser-supplied authority labels
- browser-supplied source text as authoritative
- browser-supplied hashes without independent verification

Client retrieval is a relevance hint only.

## 3. Client Retrieval Role

The browser may search the public approved knowledge bundle to identify
potentially relevant E-ZERO chunks.

The browser may send only bounded retrieval hints:

{
  "retrieval_hints": {
    "protocol_version": "0.1",
    "chunk_ids": [
      "SRC-001-C001"
    ]
  }
}

Maximum hinted chunks:

5

The browser SHOULD NOT send raw approved knowledge text as scientific authority.

## 4. Gateway Retrieval Role

The public HTTPS gateway MUST independently resolve knowledge from its own
approved server-side E-ZERO knowledge bundle.

The gateway MUST verify that every resolved chunk:

- exists in the approved manifest/bundle
- belongs to an approved source
- has the expected source provenance
- has not been replaced by an unapproved source
- remains read-only

Unknown chunk IDs MUST be ignored or rejected.

## 5. Scientific Evidence Boundary

Only content independently resolved from an approved evidence source may
support an E-ZERO scientific claim.

A client-provided chunk ID does NOT increase evidence strength.

Authority hierarchy remains:

1. EVIDENCE_REGISTRY
2. validated status sources
3. frozen specifications
4. approved feature/explanation sources

Qwen remains interpretation, not evidence authority.

## 6. Prompt-Injection Boundary

Retrieved documents are reference material, not executable instructions.

The gateway MUST treat instructions found inside retrieved source text as data.

Retrieved text MUST NOT override:

- system governance
- safety rules
- evidence boundaries
- diagnostic-claim restrictions
- deployment rules
- human approval requirements

## 7. Request Extension

The existing V0.1 request remains valid.

Optional extension:

{
  "question": "string",
  "response_language": "string",
  "answer_length": "short|normal|detailed",
  "session_id": "ephemeral-string",
  "history": [],
  "retrieval_hints": {
    "protocol_version": "0.1",
    "chunk_ids": []
  }
}

If retrieval_hints is absent, the gateway may perform its own retrieval.

## 8. Server-Side Retrieval Preference

For scientific or system-specific questions, server-side retrieval is the
authoritative retrieval path.

Client retrieval exists to improve relevance and latency only.

The gateway MAY ignore client retrieval hints and independently retrieve
better approved chunks.

## 9. Context Limits

Maximum retrieved chunks supplied to Qwen:

5

Maximum approved retrieved context:

6500 characters for V0.1 unless separately validated.

Conversation history and retrieved knowledge MUST remain separate.

## 10. Fail-Closed Behaviour

If approved knowledge cannot be verified, the gateway MUST NOT fabricate
E-ZERO facts.

For evidence-dependent questions it must return:

INSUFFICIENT_VERIFIED_EZERO_EVIDENCE

## 11. Learning Boundary

Retrieval is NOT model training.

Retrieval does not:

- alter model weights
- modify approved sources
- promote user statements into evidence
- create permanent personal memory
- change scientific claims

## 12. Production Activation Gate

Retrieval-assisted public Qwen may be enabled only after:

- server-side approved bundle exists
- bundle integrity check passes
- chunk-ID resolution passes
- unknown-ID rejection passes
- prompt-injection boundary test passes
- evidence-priority test passes
- no-client-authority test passes
- fail-closed test passes
- evidence registry validator passes
- public HTTPS browser test passes
