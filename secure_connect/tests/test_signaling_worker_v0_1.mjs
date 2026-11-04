import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import worker,{SecureConnectDirectory,__test as ws} from "../cloudflare/signaling_worker_v0_1.mjs";
import {createOrLoadIdentity,signAction,signatureText,inviteLink,
  incomingInvite,apiRequest} from "../client/signaling_client_v0_1.mjs";

if(!globalThis.crypto) globalThis.crypto=webcrypto;
globalThis.__EZERO_TEST_ONLY__=true;
const ORIGIN="https://coma39658-ctrl.github.io";
const URL="https://ezero-connect-lab.example.workers.dev/v1/friends";
const SECRET="pilot-join-secret-for-tests-only-do-not-deploy";
const baseEnv={PILOT_ENABLED:"true",PILOT_JOIN_SECRET:SECRET,ALLOW_LOCAL_TEST_ORIGIN:"false"};

class LocalStorage {
  constructor(){this.data=new Map();this.alarmAt=null;}
  async get(k){return this.data.get(k);}
  async put(k,v){this.data.set(k,structuredClone(v));}
  async delete(k){this.data.delete(k);}
  async list({prefix="",limit=1000}={}){
    return new Map([...this.data.entries()].filter(([k])=>k.startsWith(prefix))
      .sort(([a],[b])=>a.localeCompare(b)).slice(0,limit));
  }
  async transaction(fn){return fn(this);}
  async getAlarm(){return this.alarmAt;}
  async setAlarm(when){this.alarmAt=when;}
}
function makeEnvironment(){
  const storage=new LocalStorage();
  const directory=new SecureConnectDirectory({storage},baseEnv);
  const env={...baseEnv,DIRECTORY:{getByName(name){
    assert.equal(name,"ezero-secure-connect-pilot-v1");
    return {fetch:req=>directory.fetch(req)};
  }}};
  async function transport(url,opts={}) {
    return worker.fetch(new Request(url,{...opts,
      headers:{...opts.headers,Origin:ORIGIN}}),env);
  }
  return {storage,directory,env,transport};
}
async function person(){
  let record;
  const store={get:async()=>record,put:async v=>{record=v;},close:()=>{}};
  const one=await createOrLoadIdentity({consent:true,storage:store});
  const again=await createOrLoadIdentity({consent:true,storage:store});
  assert.equal(one.account,again.account,"Nonextractable identity should be stable across reloads");
  assert.equal(one.keys.privateKey.extractable,false);
  return one;
}
async function send(transport,id,type,options={}) {
  return apiRequest(URL,id,type,{transport,pilotJoinSecret:SECRET,...options});
}
function direct(request,env){
  return worker.fetch(request,env);
}
async function post(transport,body,secret) {
  return transport(URL,{method:"POST",headers:{"content-type":"application/json",
    ...(secret?{"x-ezero-pilot-join":secret}:{})},body:JSON.stringify(body)});
}
test("staging worker is fail-closed without explicit consent and provisioning", async()=>{
  const {env,transport}=makeEnvironment();
  const health=await worker.fetch(new Request("https://host.test/health"),env);
  assert.equal((await health.json()).calling,"NOT_AVAILABLE");
  const disabled=await direct(new Request(URL,{method:"POST",headers:{
    Origin:ORIGIN,"content-type":"application/json"
  },body:"{}"}),{PILOT_ENABLED:"false"});
  assert.equal(disabled.status,503);
  assert.equal((await disabled.json()).code,"PILOT_DISABLED");
  const forbidden=await direct(new Request(URL,{method:"POST",headers:{
    Origin:"https://attacker.example","content-type":"application/json"
  },body:"{}"}),env);
  assert.equal(forbidden.status,403);
  const options=await transport(URL,{method:"OPTIONS"});
  assert.equal(options.status,204);
  assert.equal(options.headers.get("access-control-allow-origin"),ORIGIN);
  assert.equal(options.headers.get("cache-control"),"no-store");
  const badType=await transport(URL,{method:"POST",headers:{"content-type":"text/plain"},body:"{}"});
  assert.equal(badType.status,415);
});
test("explicit local identity consent, cryptographic proof and stable signed friend invites",async()=>{
  await assert.rejects(createOrLoadIdentity(),/USER_CONSENT_REQUIRED/);
  const a=await person(),b=await person();
  assert.notEqual(a.account,b.account);
  assert.equal(a.account.length,64);
  const link=inviteLink("https://coma39658-ctrl.github.io/null-bench/ezero_secure_connect_live_p2p_v0_1.html",a);
  assert.match(link,/#friend=[0-9a-f]{64}$/);
  assert.equal(incomingInvite(link),a.account);
  assert.equal(incomingInvite(link.replace("#friend=","#bad=")),null);
  assert.equal(incomingInvite("https://example.test/#friend=anything"),null);
  const s=await signAction(a,"register");
  assert.equal(signatureText(s),ws.signedText(s),"Client and Worker canonical data must be identical");
  assert.equal(ws.expectedShape(s),true);
});
test("public-key binding, joined pilot, replay protection and bilateral friend approval",async()=>{
  const {storage,env,transport}=makeEnvironment();
  const a=await person(),b=await person(),c=await person();

  const wrongJoin=await post(transport,await signAction(a,"register"),"wrong-code-that-has-enough-characters");
  assert.equal(wrongJoin.status,403);
  assert.equal((await wrongJoin.json()).code,"PILOT_ACCESS_DENIED");

  const forged=await signAction(a,"register");
  forged.signature=forged.signature.slice(0,-2)+"xx";
  const forbidden=await post(transport,forged,SECRET);
  assert.equal(forbidden.status,403);
  assert.equal((await forbidden.json()).code,"SIGNATURE_INVALID");

  assert.equal((await send(transport,a,"register")).code,"REGISTERED");
  assert.equal((await send(transport,b,"register")).code,"REGISTERED");
  assert.equal((await send(transport,c,"register")).code,"REGISTERED");
  assert.equal((await send(transport,a,"register")).code,"ALREADY_REGISTERED");
  const unsigned=await signAction(a,"request",{to:b.account});
  unsigned.to=c.account; // recipient changed AFTER signing
  const tamper=await post(transport,unsigned);
  assert.equal(tamper.status,403);
  assert.equal((await tamper.json()).code,"SIGNATURE_INVALID");

  const invite=await signAction(a,"request",{to:b.account});
  assert.equal((await post(transport,invite)).status,200);
  const replay=await post(transport,invite);
  assert.equal(replay.status,409);
  assert.equal((await replay.json()).code,"REPLAY_BLOCKED");

  const inbox=await send(transport,b,"inbox");
  assert.deepEqual(inbox.pending.map(x=>x.from),[a.account]);
  const firstFriends=await send(transport,b,"friends");
  assert.deepEqual(firstFriends.friends,[],"Sending an invitation is not friendship");
  const accepted=await send(transport,b,"respond",{to:a.account,decision:"accept"});
  assert.equal(accepted.code,"FRIENDSHIP_ACCEPTED");
  assert.equal(accepted.bothLinked,true);
  assert.deepEqual((await send(transport,a,"friends")).friends,[b.account]);
  assert.deepEqual((await send(transport,b,"friends")).friends,[a.account]);
  assert.deepEqual((await send(transport,b,"inbox")).pending,[]);
  assert.equal((await send(transport,a,"request",{to:b.account})).code,"ALREADY_FRIENDS");
  assert.equal((await send(transport,a,"remove",{to:b.account})).code,"FRIEND_REMOVED");
  assert.deepEqual((await send(transport,a,"friends")).friends,[]);
  assert.deepEqual((await send(transport,b,"friends")).friends,[]);

  // Recipient can decline; rejection cannot be bypassed by immediate re-invite.
  assert.equal((await send(transport,c,"request",{to:a.account})).code,"REQUEST_SENT");
  assert.equal((await send(transport,a,"respond",{to:c.account,decision:"decline"})).code,
    "INVITE_DECLINED");
  await assert.rejects(send(transport,c,"request",{to:a.account}),/DECLINED_COOLDOWN/);
  // Wrong person can't accept an invitation for another account.
  assert.equal((await send(transport,a,"request",{to:b.account})).code,"REQUEST_SENT");
  await assert.rejects(send(transport,c,"respond",{to:a.account,decision:"accept"}),/NO_PENDING_INVITE/);
  assert.deepEqual((await send(transport,c,"friends")).friends,[]);

  // No user-entered names, photos, messages, SDP, media or call payloads in storage.
  const dump=JSON.stringify([...storage.data.entries()]);
  for(const forbiddenWord of ["\"displayName\"","\"photo\"","\"sdp\"","\"message\"","\"media\"","\"pilot-join-secret"]){
    assert.equal(dump.includes(forbiddenWord),false,"Forbidden stored data "+forbiddenWord);
  }
  assert.ok(dump.includes(a.account));
  assert.ok(!dump.includes(SECRET),"Pilot secret must never be written to durable storage");
  assert.ok(storage.alarmAt>0,"Timed nonce and invitations must schedule cleanup");
  assert.equal(env.PILOT_ENABLED,"true");
});
test("unknown accounts, blocked self linking, request limits and invalid shapes",async()=>{
  const {transport}=makeEnvironment();
  const a=await person(),b=await person();
  await send(transport,a,"register");
  await assert.rejects(send(transport,a,"request",{to:b.account}),/FRIEND_NOT_REGISTERED/);
  await assert.rejects(send(transport,a,"request",{to:a.account}),/SELF_REQUEST/);
  await assert.rejects(send(transport,b,"inbox"),/ACCOUNT_NOT_REGISTERED/);
  const stale=await signAction(a,"friends");
  stale.ts=Date.now()-600000;
  const res=await post(transport,stale);
  assert.equal(res.status,400);
  assert.equal((await res.json()).code,"BAD_SIGNED_REQUEST");
  const badExtra=await signAction(a,"friends");
  badExtra.unsafe="server_should_reject";
  const bad=await post(transport,badExtra);
  assert.equal(bad.status,400);
  assert.equal((await bad.json()).code,"BAD_SIGNED_REQUEST");
  const tooBig=await transport(URL,{method:"POST",headers:{"content-type":"application/json"},
    body:"x".repeat(4200)});
  assert.equal(tooBig.status,413);
});
console.log("SECURE_CONNECT_STAGING_WORKER_NO_DEPLOYMENT_OR_AUTO_FRIENDSHIP");
