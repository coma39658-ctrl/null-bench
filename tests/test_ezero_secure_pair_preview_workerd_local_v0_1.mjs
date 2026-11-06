import assert from "node:assert/strict";
/*
 * Local Cloudflare workerd integration, not a deployment.
 * Uses unprivileged static preview + intentionally disabled /api.
 */
const origin=process.env.EZERO_PREVIEW_LOCAL_ORIGIN;
assert.ok(origin?.startsWith("http://127.0.0.1:"));
async function get(path,options){
 const r=await fetch(origin+path,options);
 assert.equal(r.headers.get("access-control-allow-origin"),null);
 assert.equal(r.headers.get("set-cookie"),null);
 assert.equal(r.headers.get("cache-control"),"no-store, private, max-age=0");
 return r;
}
const root=await get("/");
assert.equal(root.status,200);
assert.match(root.headers.get("content-type"),/text\/html/);
const html=await root.text();
assert.match(html,/<html lang="ur" dir="rtl">/);
assert.match(html,/تجرباتی حالت/);
assert.ok(!/<form\b|<input\b|<script\b/i.test(html));
assert.match(root.headers.get("content-security-policy"),/default-src 'none'/);
assert.equal(root.headers.get("x-robots-tag"),"noindex, nofollow, noarchive");
for(const path of [
 "/api/ezero-pair/v1/session/status",
 "/api/ezero-pair/v1/session/logout",
 "/api/ezero-pair/v1/auth/login",
 "/api/ezero-pair/v1/auth/register",
 "/api/ezero-pair/v1/trusted-devices/activate",
 "/api/ezero-pair/v1/call",
 "/secure-pair/connect"
]){
 const r=await get(path);
 assert.equal(r.status,503,path);
 const body=await r.json();
 assert.equal(body.authenticatedAccountEnabled,false);
 assert.equal(body.publicPairingEnabled,false);
 assert.equal(body.publicCallingEnabled,false);
}
const mutation=await get("/api/ezero-pair/v1/auth/login",{
 method:"POST",headers:{"content-type":"application/json"},
 body:JSON.stringify({trusted:true,approved:true,auth:true})
});
assert.equal(mutation.status,503);
const health=await get("/health");
assert.equal(health.status,200);
assert.equal((await health.json()).status,"PREVIEW_ONLY_NO_AUTH");
for(const path of ["/wrangler.jsonc","/private.key","/.env","/logs",
 "/health?session=leak","/index.html?token=leak"]){
 const r=await get(path);
 assert.ok([400,404].includes(r.status),path+" "+r.status);
}
console.log("CLOUDFLARE_LOCAL_REAL_WORKER_STATIC_PREVIEW_URDU_MOBILE: PASS");
console.log("CLOUDFLARE_LOCAL_WORKER_FIRST_API_CALL_LOGIN_TRUST_DENIED: PASS");
console.log("NO_PUBLIC_CLOUDFLARE_DEPLOYMENT_OR_AUTHENTICATED_SESSION: CONFIRMED");
