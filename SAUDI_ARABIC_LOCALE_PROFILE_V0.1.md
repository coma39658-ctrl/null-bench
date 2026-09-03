# E-ZERO Saudi Arabic Locale Profile V0.1

Status: DRAFT
Scope: Public Arabic presentation layer only
Locale target: Saudi Arabia
Primary public context: Riyadh / Saudi professional and official-facing usage

## 1. Written Standard

Arabic public content MUST use Modern Standard Arabic
(العربية الفصحى الحديثة).

## 2. Saudi Context

Wording SHOULD be natural and professional for Saudi users,
including users in Riyadh.

Najdi or colloquial Riyadh Arabic MUST NOT replace controlled
scientific, validation, safety, or evidence terminology.

## 3. Evidence Boundary

Arabic translation MUST NOT strengthen or weaken:

- PASS
- FAIL
- SOFTWARE VALIDATED
- SIMULATION
- LIVE GPS PENDING
- READ-ONLY
- REAL_SENSOR
- NO VEHICLE CONTROL
- NO DIAGNOSTIC OR RUL CLAIM
- SOFTWARE EVIDENCE ≠ PHYSICAL PROOF

## 4. Terminology Style

Prefer clear professional Arabic suitable for:

- public users
- businesses
- workshops
- fleet operators
- industrial partners
- universities
- government-facing communication

Avoid ambiguous wording that could imply a stronger validation level.

## 5. UI Direction

Arabic uses RTL.

The document `lang` value remains `ar` in V0.1.

A future locale-specific implementation MAY use `ar-SA`
after separate review.

## 6. Translation Review Requirement

Arabic public text MUST be reviewed for:

- Saudi professional readability
- Modern Standard Arabic correctness
- evidence-semantic equivalence
- safety-boundary equivalence
- absence of colloquial ambiguity

## 7. Next Gate

DRAFT
→ Arabic wording review
→ controlled terminology review
→ translation update
→ validation
→ public deployment
