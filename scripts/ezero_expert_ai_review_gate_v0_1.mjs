/*
 * Offline, zero-cost design-review quality gate.
 * It validates the expert AI engineering question/decision register, links
 * each review item to an action and evidence status, and prevents
 * accidentally treating an AI proposal as independent release approval.
 * It does not call an AI, touch secrets or deploy.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const record=JSON.parse(readFileSync(
 "docs/EZERO_EXPERT_AI_ENGINEERING_REVIEW_20261105.json","utf8"));
const release=JSON.parse(readFileSync(
 "docs/EZERO_SECURE_PAIR_V1_RELEASE_GATES_20261105.json","utf8"));
assert.equal(record.schema,"EZERO_EXPERT_AI_ENGINEERING_REVIEW_V0_1");
assert.equal(record.release,"NO_GO");
assert.equal(release.decision,"NO_GO");
assert.equal(record.rules.no_claim_without_evidence,true);
assert.equal(record.rules.no_ai_write_to_public_or_credential_sources,true);
assert.equal(record.rules.no_automatic_spend,true);
assert.equal(record.rules.keep_obd_read_only,true);
assert.equal(record.rules.no_user_secrets_in_chat,true);
assert.equal(record.rules.explain_failures_in_urdu,true);
assert.ok(record.workflow.includes("Human release approval"));
assert.ok(Array.isArray(record.questions)&&record.questions.length>=20);
const statuses=new Set(["LAB_PASS","OPEN","BLOCKED","UNKNOWN"]);
const ids=new Set(),categories=new Set();
let highPriority=0,lab=0,unverified=0;
for(const q of record.questions){
 assert.match(q.id,/^[A-Z][A-Z0-9]*-[0-9]{3}$/);
 assert.ok(!ids.has(q.id),"DUPLICATE_QUESTION_ID: "+q.id);
 ids.add(q.id);
 assert.ok(typeof q.category==="string"&&q.category.length>2);
 categories.add(q.category);
 assert.ok(["P0","P1","P2"].includes(q.priority));
 assert.ok(statuses.has(q.status));
 assert.ok(q.question_ur?.length>=18&&q.decision_ur?.length>=18&&
  q.next_action_ur?.length>=18,"INCOMPLETE_EXPERT_REVIEW_ITEM: "+q.id);
 const src=new URL(q.source);
 assert.equal(src.protocol,"https:");
 assert.ok(src.hostname.length>5);
 if(q.priority==="P0")highPriority++;
 if(q.status==="LAB_PASS"){
  lab++;
  assert.ok(/^https:\/\/github\.com\/coma39658-ctrl\/null-bench\/actions\/runs\/\d+$/
   .test(q.evidence),"LAB_PASS_REQUIRES_CONCRETE_GITHUB_EVIDENCE: "+q.id);
 }else{
  unverified++;
  assert.equal(q.evidence,null,
   "UNVERIFIED_GATE_MUST_NOT_CLAIM_SUCCESS: "+q.id);
 }
}
assert.ok(categories.size>=10);
assert.ok(highPriority>=10);
assert.ok(lab>=3);
assert.ok(unverified>=10,"DO_NOT_AUTO_PROMOTE_OPEN_GATES");
const preview=readFileSync(
 "secure_connect/pair_v1/preview_worker_lab/wrangler.jsonc","utf8");
assert.ok(preview.includes('"workers_dev": false'));
assert.ok(preview.includes('"run_worker_first": true'));
const calls=readFileSync("secure_connect/call_room_lab/wrangler.jsonc","utf8");
assert.ok(calls.includes('"ROOMS_ENABLED": "false"'));
const worker=readFileSync(
 "secure_connect/pair_v1/preview_worker_lab/worker.mjs","utf8");
assert.ok(worker.includes('AUTH_AND_CALLS_NOT_AVAILABLE'));
assert.ok(worker.includes("publicCallingEnabled:false"));
console.log("EXPERT_AI_REVIEW_QUESTIONS:",record.questions.length);
console.log("EXPERT_AI_REVIEW_CATEGORIES:",categories.size);
console.log("REVIEW_SYNTHETIC_EVIDENCE:",lab);
console.log("REVIEW_UNVERIFIED_OPEN_OR_BLOCKED:",unverified);
console.log("ENGINEERING_AI_PROPOSE_TEST_EVIDENCE_HUMAN_RELEASE_BOUNDARY: PASS");
console.log("PUBLIC_PAIRING_RELEASE_STATUS: NO_GO");
console.log("NO_NETWORK_NO_COST_NO_DEPLOYMENT: CONFIRMED");
