/* Staging-only architecture gate: per-owner Durable Object isolation, not a load test. */
const fs=require("node:fs");const assert=require("node:assert/strict");
const worker=fs.readFileSync("signaling/cloudflare/src/trusted_inbox_candidate_v0_1.js","utf8");
const config=fs.readFileSync("signaling/cloudflare/wrangler.trusted-render-test-20261111.jsonc","utf8");
const tests=[
 ["per-owner address",()=>assert.match(worker,/\/v1\\\/trusted\\\/|ROUTE=\/\^\\\/v1/)],
 ["durable object binding",()=>assert.match(config,/"class_name"\s*:\s*"TrustedInbox"/)],
 ["owner-specific object selection",()=>assert.match(worker,/idFromName\(/)],
 ["trusted sender enforcement",()=>assert.match(worker,/current\.includes\(a\.fp\)/)],
 ["bounded clients per identity",()=>assert.match(worker,/MAX_CLIENTS\s*=\s*8/)],
 ["no offline invitation storage",()=>assert.match(worker,/No offline storage/)],
 ["call replay control",()=>assert.match(worker,/REPLAY_MS/)],
 ["call cooldown",()=>assert.match(worker,/COOLDOWN_MS/)]
];
let fails=0;for(const [name,fn] of tests){try{fn();console.log("PASS "+name)}catch(e){fails++;console.error("FAIL "+name+": "+e.message)}}
console.log("Scale architecture static contracts: "+(tests.length-fails)+" PASS, "+fails+" FAIL; concurrency/load capacity NOT verified");if(fails)process.exitCode=1;
