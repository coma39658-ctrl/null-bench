/*
 * E-ZERO Secure Pair V1 — NO-DEPLOY release-preflight evidence gate.
 * This script NEVER deploys, grants permission, modifies secrets, or
 * alters Cloudflare Worker environment. CI status mode is informational;
 * verify-release mode refuses missing human-vetted physical evidence.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const path="docs/EZERO_SECURE_PAIR_V1_RELEASE_GATES_20261105.json";
const data=JSON.parse(readFileSync(path,"utf8"));
assert.equal(data.schema,"EZERO_SECURE_PAIR_V1_RELEASE_GATES_20261105");
assert.ok(["NO_GO","GO"].includes(data.decision));
assert.ok(data.gates&&typeof data.gates==="object");
const required=[
 "signed_browser_and_local_worker_regression",
 "independently_verified_account_ownership_and_recovery",
 "stable_same_origin_https_passkey_rp_and_cookie_host",
 "authenticated_cookie_csrf_and_session_revocation",
 "atomic_90_second_pair_enrollment_and_trusted_device_activation",
 "lost_device_and_live_call_revocation",
 "android_and_iphone_physical_multinetwork_tests",
 "turn_reliability_rate_limits_and_cost_limit",
 "independent_security_review_and_owner_release_approval"
];
const worker=readFileSync("secure_connect/call_room_lab/wrangler.jsonc","utf8");
if(!worker.includes('"ROOMS_ENABLED": "false"'))
 throw Error("UNSAFE_LAB_DEFAULT_PUBLIC_ROOMS_ENABLED");
const missing=required.filter(k=>{
 const gate=data.gates[k];
 return gate?.status!=="PASS"||
  typeof gate.evidence!=="string"||
  !/^https:\/\/[^\s]+$/.test(gate.evidence);
});
const ready=data.decision==="GO"&&missing.length===0;
const mode=process.argv[2]||"--status";
if(!["--status","--verify-release"].includes(mode))
 throw Error("UNKNOWN_MODE");
if(mode==="--verify-release"&&!ready){
 console.error("EZERO_SECURE_PAIR_PUBLIC_RELEASE_DENIED_NO_GO");
 for(const k of missing)console.error("BLOCKED:",k);
 process.exitCode=2;
}else if(mode==="--status"){
 console.log("EZERO_SECURE_PAIR_PUBLIC_RELEASE_STATUS:",ready?"GO_PENDING_HUMAN_CONTROL":"NO_GO");
 console.log("VERIFIED_LAB_ONLY_GATES:",required.length-missing.length);
 for(const k of missing)console.log("REMAINING_GATE:",k);
 console.log("NO_DEPLOYMENT_OR_LIVE_WORKER_MUTATION: CONFIRMED");
}else{
 console.log("GO_GATES_RECORDED_HUMAN_RELEASE_APPROVAL_STILL_REQUIRED");
 console.log("NO_DEPLOYMENT_OR_LIVE_WORKER_MUTATION: CONFIRMED");
}
