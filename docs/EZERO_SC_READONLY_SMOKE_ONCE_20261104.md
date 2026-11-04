# E-ZERO Secure Connect — GET-only staging smoke

Read-only verification after isolated staging Wrangler deployment. No Cloudflare writes, no pilot enablement, no call media and no secret values printed. Check that the script exists and that /health reports disabled state. The first immediate health probe returned HTTP 404, so the retry-based smoke separates propagation delays from persistent routing/configuration issues.
