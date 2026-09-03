# E-ZERO Public Multilingual Interface Specification V0.1

Status: DRAFT
Scope: Public website presentation layer only
Evidence policy: No status without scope. No claim without evidence.

## 1. Purpose

Provide controlled multilingual access to the E-ZERO public website while preserving the exact scientific, validation, safety, and evidence meaning of the English source.

Translation MUST NOT increase, weaken, reinterpret, or otherwise alter an evidence claim.

## 2. Non-Goals

V0.1 does NOT:

- use uncontrolled live machine translation;
- automatically force a visitor into a detected language;
- translate evidence values into different scientific meanings;
- change evidence-registry results;
- change PASS/FAIL outcomes;
- change module readiness;
- activate frozen or pending capabilities.

## 3. Supported Languages V0.1

The initial multilingual release targets widely used global languages
while preserving controlled evidence terminology.

Supported languages:

- English — en
- العربية — ar
- اردو — ur
- हिंदी — hi
- 中文（简体）— zh-CN
- Español — es
- Français — fr
- Português — pt
- বাংলা — bn
- Русский — ru
- Bahasa Indonesia — id
- 日本語 — ja
- Deutsch — de
- Türkçe — tr
- 한국어 — ko

English is the canonical fallback language.

The architecture MUST remain extensible for additional languages after
separate translation and controlled-terminology review.

A language MUST NOT be publicly marked complete merely because ordinary
UI strings have been translated. Its controlled evidence/status
terminology must also pass review and validation.

## 4. Language Detection and Switching

A permanent language control MUST be available through a single
Language / 🌐 interface.

Browser or device language MAY be used only to suggest a language.

Detection MUST NOT silently force a language change.

The visitor always retains manual control.

### 4.1 Primary Header Visibility

The Language / 🌐 control MUST be visible in the primary top header when
the website first loads.

It MUST NOT be hidden only inside:

- a secondary settings page;
- a footer;
- a technical submenu;
- a module-specific page.

On desktop, the control MUST remain directly visible in the main top
header/navigation area.

On mobile, the language control MUST remain directly accessible from the
top header and MUST NOT require navigation into a settings screen.

If the public header uses sticky behavior, the language control SHOULD
remain accessible while scrolling.

The language control MUST be clearly recognizable without requiring the
visitor to understand English.

## 5. Persistence

A visitor's explicit language selection MAY be stored locally using
localStorage.

No account, identity, precise location, or remote tracking is required
for language preference persistence.

## 6. Controlled Terminology

Evidence/status terminology MUST be maintained separately from ordinary
interface translations.

Controlled terminology includes, but is not limited to:

- PASS
- FAIL
- SOFTWARE VALIDATED
- SIMULATION
- SIMULATED
- LOG_REPLAY
- REAL_SENSOR
- LIVE GPS PENDING
- READ-ONLY
- MODE 04 / CLEAR DTC DISABLED
- NO VEHICLE CONTROL
- NO DIAGNOSTIC OR RUL CLAIM
- SOFTWARE EVIDENCE ≠ PHYSICAL PROOF

Each controlled term MUST have:

- a stable translation key;
- an English canonical meaning;
- reviewed translations;
- versioned change history;
- explicit approval before public release.

A translation MUST NOT imply a stronger evidence level than the
canonical English term.

## 7. Evidence Isolation

Language switching MUST NOT modify:

- evidence registry values;
- hashes;
- validation outcomes;
- metrics;
- provenance;
- module status;
- scientific thresholds;
- safety boundaries.

Translation is a presentation-layer operation only.

## 8. RTL / LTR Support

Urdu (`ur`) and Arabic (`ar`) MUST render using RTL direction.

All other V0.1 languages MUST render using LTR direction:

- English (`en`)
- Hindi (`hi`)
- Simplified Chinese (`zh-CN`)
- Spanish (`es`)
- French (`fr`)
- Portuguese (`pt`)
- Bengali (`bn`)
- Russian (`ru`)
- Bahasa Indonesia (`id`)
- Japanese (`ja`)
- German (`de`)
- Turkish (`tr`)
- Korean (`ko`)

Changing language MUST correctly update the document `lang` and `dir`
attributes without changing evidence content.

Browser-language detection MAY map compatible language variants to a
supported V0.1 language suggestion.

For Simplified Chinese, browser values such as `zh`, `zh-CN`, and
`zh-Hans` MAY suggest `zh-CN`.

Detection remains advisory only. An explicit user language selection
always takes precedence.

## 9. Fallback Behavior

If a translated UI string is unavailable, the canonical English string
MUST be displayed.

Missing translations MUST NOT produce:

- blank content;
- broken controls;
- fabricated translations;
- altered evidence terminology.

## 10. Extensibility

Translation resources MUST use stable keys rather than direct
replacement of arbitrary page text.

New languages begin in DRAFT status.

A new language MUST NOT be publicly marked complete until its required
UI strings and controlled terminology pass review.

## 11. Accessibility and SEO

The active document `lang` attribute MUST reflect the selected language.

RTL/LTR direction MUST be exposed correctly to the browser.

Where separate indexable language URLs are introduced in a future
release, appropriate `hreflang` metadata MUST be used.

V0.1 MUST NOT publish misleading `hreflang` references to language URLs
that do not actually exist.

## 12. Translation Validator

A multilingual validator SHOULD be implemented before public deployment.

At minimum it MUST detect:

- missing required translation keys;
- missing controlled-status translations;
- unsupported language codes;
- duplicate keys;
- invalid RTL/LTR configuration;
- unauthorized modification of frozen controlled terminology.

Validator PASS/FAIL output SHOULD be preserved as an audit artifact,
consistent with E-ZERO evidence governance.

## 13. Acceptance Gates

Before V0.1 implementation is declared complete:

1. All fifteen V0.1 language selections must function.
2. Manual language selection must override detection.
3. User selection must persist correctly.
4. English fallback must work.
5. Urdu and Arabic RTL rendering must pass.
6. No evidence value may change when language changes.
7. Controlled terminology must pass semantic review.
8. PASS and FAIL must remain distinguishable and unchanged.
9. Frozen/pending capability status must remain unchanged.
10. Missing translations must fail safely to English.
11. Accessibility behavior must remain usable.
12. Translation validator must PASS.
13. Language / 🌐 control must be visible in the primary top header on initial page load.
14. Mobile users must be able to access language switching directly from the top header.
15. Language switching must not require opening a secondary settings page.

## 14. Governance Boundary

Multilingual support is a presentation capability.

It is NOT evidence of:

- diagnostic validity;
- physical hardware validation;
- REAL_SENSOR validation;
- live GPS validation;
- vehicle-control authority;
- machinery-control authority;
- safety certification.

## 15. Next Gate

DRAFT
→ terminology review
→ translation review
→ validator design/review
→ specification freeze/tag
→ implementation
→ acceptance testing
→ separately reviewed public deployment

No implementation is authorized by this DRAFT specification alone.
