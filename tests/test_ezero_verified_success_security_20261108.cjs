"use strict";
/* Non-destructive CI guard for E-ZERO Secure App STAGING.
 * This is a *baseline integrity* check, not proof of an unhackbar service.
 * Never sync baseline digests automatically: update only with explicit review.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p));
const str=p=>read(p).toString("utf8");
const manifest=JSON.parse(str("tests/ezero_verified_success_lock_20261108.json"));
const expected=manifest.gitBlobSHA1;
assert.ok(Object.keys(expected).length>=7,"Pin all critical tested media, QR and identity modules");
assert.ok(manifest.sha256 && Object.keys(manifest.sha256).length===Object.keys(expected).length,
 "An independent SHA-256 digest is required for each frozen file");
for(const [file,sha] of Object.entries(expected)){
  assert.match(file,/^js\/[a-zA-Z0-9_-]+\.js$/);
  assert.match(sha,/^[a-f0-9]{40}$/);
  const buf=read(file);
  const actual=crypto.createHash("sha1").update("blob "+buf.length+"\0").update(buf).digest("hex");
  assert.equal(actual,sha,"FROZEN VERIFIED SUCCESS code changed without approval: "+file);
  const actualSha256=crypto.createHash("sha256").update(buf).digest("hex");
  assert.match(manifest.sha256[file],/^[a-f0-9]{64}$/,"Invalid SHA-256 baseline: "+file);
  assert.equal(actualSha256,manifest.sha256[file],"SHA256 critical module was modified: "+file);
  console.log("FROZEN_MODULE_INTEGRITY: PASS "+file);
  console.log("BASELINE_SHA256 "+file+" "+actualSha256);
}
const page=str("ezero_trusted_friends_staging_20261106.html");
assert.match(page,/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>/);
const tag=page.match(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>/)?.[0]||"";
const csp=tag.match(/\bcontent="([^"]+)"/)?.[1]||"";
for(const requirement of [
  "default-src 'none'","script-src 'self'","style-src 'self'",
  "object-src 'none'","base-uri 'none'","form-action 'none'",
  "connect-src 'self' wss://ezero-browser-signaling-pilot.coma39658.workers.dev"
])assert.ok(csp.includes(requirement),"Missing restrictive CSP: "+requirement);
assert.ok(!/unsafe-inline|unsafe-eval|\bws:\/\//i.test(csp),"Unsafe CSP execution or plaintext WS prohibited");
const tags=[...page.matchAll(/<script\b[^>]*>/gi)];
assert.ok(tags.length>20,"Expected many intentionally self-hosted scripts");
for(const [raw] of tags){
  const src=raw.match(/\bsrc="([^"]+)"/i)?.[1];
  assert.ok(src&&src.startsWith("./"),"No inline/external executable scripts on stage: "+raw);
  assert.ok(!src.includes("..")&&!/[\s<>]/.test(src),"Unexpected script path: "+src);
}
assert.ok(!/<iframe\b/i.test(page),"No untrusted embeddable iframe on call surface");
console.log("STRICT_SELF_HOSTED_CONTENT_SECURITY_POLICY: PASS");
const config=str("js/ezero_auto_signaling_lab_config_20261106.js");
assert.match(config,/websocketOrigin:\s*"wss:\/\/ezero-browser-signaling-pilot\.coma39658\.workers\.dev"/);
assert.ok(!/websocketOrigin:\s*"ws:\/\//i.test(config),"TLS is mandatory for signaling");
const qr=str("js/ezero_trusted_stage_one_request_v0_1.js");
assert.ok(qr.includes("url.origin===location.origin"),"Signed invite origin must be exact");
assert.ok(qr.includes("safeInvite(candidate)"),"Signed invitation must be validated");
assert.ok(qr.includes("location.assign(candidate)"),"Decoded QR should use validated branch only");
const identity=str("js/ezero_saved_friend_stage_engine_v0_1.js");
for(const item of ["crypto.subtle.verify","crypto.subtle.sign","crypto.getRandomValues","identityPayload","EXPIRED_ID"]){
  assert.ok(identity.includes(item),"Missing identity security building block: "+item);
}
assert.ok(identity.includes('namedCurve:"P-256"'),"Require supported public-key algorithm");
assert.ok(identity.includes("location.origin"),"Identity must be bound to its origin");
const device=str("js/ezero_secure_connect_device_identity_v0_1.js");
assert.ok(device.includes("IndexedDB")||device.includes("indexedDB"),"Private device keys must be stored separately");
assert.ok(!/localStorage\.setItem\([^,]*privateKey/.test(device),"Private keys in localStorage are forbidden");
const cfgs=[
 "js/ezero_auto_signaling_lab_config_20261106.js",
 "js/ezero_trusted_inbox_stage_config_20261106.js"
];
for(const f of cfgs){
 const s=str(f);
 assert.ok(!/(?:CF_API_TOKEN|TURN_SHARED_SECRET|LIVEKIT_API_SECRET|CLOUDFLARE_API_TOKEN|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*["'][^"']{12}/i.test(s),
   "Cloud keys/API secrets must never be published: "+f);
}
console.log("QR_ORIGIN_SIGNED_IDENTITY_NO_BROWSER_CLOUD_SECRET: PASS");
console.log("E_ZERO_VERIFIED_SUCCESS_SECURITY_BASELINE: PASS");
