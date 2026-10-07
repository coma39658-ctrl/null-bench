# E-ZERO Qwen Public Agent — Gate 16 Browser Integration Evidence

Date: 2026-10-07
Gate: 16 — GitHub Pages browser integration test
Result: PASS

## Public Origin

https://coma39658-ctrl.github.io/null-bench/

GitHub Pages deployed commit:

03244cac0ad636d2f63d5f73f612e20a716caef7

## Governed Gateway

https://ezero-qwen-lab-adapter.onrender.com/api/ezero-agent/v0.1/ask

## Live Browser Test

A temporary isolated test page was served from the real GitHub Pages origin and executed in a mobile browser.

Observed result:

GATE16_BROWSER_INTEGRATION: PASS
HTTP_STATUS: 200
STATUS: OK
SOURCE_CLASS: GOVERNED_AI
DIAGNOSTIC_CLAIM: false
EVIDENCE_AUTHORITY: false

The returned answer contained non-empty governed E-ZERO content.

## Verified Path

GitHub Pages browser
→ HTTPS Render governed gateway
→ Qwen provider
→ governed response
→ browser

## Safety / Activation Boundary

The main E-ZERO public interface remained:

EZERO_PUBLIC_AI_ENABLED = false

The Gate 16 test did not activate Public AI on the main interface.

The temporary browser-test page was used only to obtain pre-activation integration evidence and is removed in the cleanup change after evidence capture.

## Conclusion

GATE16_GITHUB_PAGES_BROWSER_INTEGRATION = PASS

This PASS establishes browser-to-gateway integration only. It does not grant scientific, diagnostic, physical-validation, or evidence authority to the AI.
