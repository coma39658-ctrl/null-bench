/* E-ZERO pre-release LIVE staging smoke. No deployments, secrets, media,
 * contact changes, persistent trust writes or production requests.
 * Uses a one-time synthetic device identity for a single owner handshake.
 */
import assert from "node:assert/strict";
import {createHash,webcrypto} from "node:crypto";
import WebSocket from "ws";

const ORIGIN="https://coma39658-ctrl.github.io";
const ROOT="https://ezero-trusted-friends-inbox-staging.coma39658.workers.dev";
const FINGERPRINT=/^[a-f0-9]{64}$/;
const timeLimit=12000;
const cancelTimeout=(ms,handle)=>new Promise((_,reject)=>{
  const timeout=setTimeout(()=>reject(Error("STAGING_TIMEOUT_"+handle)),ms);
  timeout.unref?.();
});
async function httpStatus(path,origin){
  const controller=new AbortController();
  const deadline=setTimeout(()=>controller.abort(),timeLimit);
  try{
    const response=await fetch(ROOT+path,{
      method:"GET",headers:origin?{"Origin":origin}:{},
      redirect:"manual",signal:controller.signal
    });
    return response.status;
  }finally{clearTimeout(deadline);}
}
async function liveSignedOwnerHandshake(){
  const keys=await webcrypto.subtle.generateKey({
    name:"ECDSA",namedCurve:"P-256"
  },false,["sign","verify"]);
  const pub=Buffer.from(await webcrypto.subtle.exportKey("spki",keys.publicKey));
  const fp=createHash("sha256").update(pub).digest("hex");
  assert.match(fp,FINGERPRINT);
  const target=fp;
  const url=ROOT.replace(/^https:/,"wss:")+"/v1/trusted/"+target;
  return await new Promise((resolve,reject)=>{
    const ws=new WebSocket(url,{origin:ORIGIN,handshakeTimeout:timeLimit,
      perMessageDeflate:false});
    let settled=false,challengeCount=0;
    const end=(err)=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      try{ws.close();}catch(_){}
      err?reject(err):resolve();
    };
    const timer=setTimeout(()=>end(Error("SIGNED_OWNER_HANDSHAKE_TIMEOUT")),
      timeLimit+5000);
    ws.on("unexpected-response",(_req,res)=>end(Error("WSS_HANDSHAKE_HTTP_"+res.statusCode)));
    ws.on("error",error=>end(Error("WSS_NETWORK_ERROR_"+error.message)));
    ws.on("close",(code)=>{if(!settled)end(Error("WSS_EARLY_CLOSE_"+code));});
    ws.on("message",async raw=>{
      try{
        const msg=JSON.parse(raw.toString("utf8"));
        if(msg?.t==="challenge"){
          assert.equal(challengeCount++,0,"Only one challenge allowed");
          assert.equal(msg.target,target);
          assert.match(msg.nonce,/^[A-Za-z0-9_-]{32}$/);
          assert.equal(msg.expires-msg.opened,20000);
          assert.ok(Date.now()<=msg.expires);
          const body=["EZERO-TRUSTED-INBOX-1",ORIGIN,target,"owner",fp,
            msg.nonce,String(msg.opened)].join("\n");
          const sig=Buffer.from(await webcrypto.subtle.sign({
            name:"ECDSA",hash:"SHA-256"
          },keys.privateKey,Buffer.from(body,"utf8"))).toString("base64url");
          ws.send(JSON.stringify({t:"hello",role:"owner",fp,
            pub:pub.toString("base64url"),sig}));
        }else if(msg?.t==="ready"){
          assert.equal(challengeCount,1);
          assert.equal(msg.role,"owner");
          end();
        }else{
          throw Error("UNEXPECTED_STAGE_PACKET_"+String(msg?.t).slice(0,40));
        }
      }catch(error){end(error);}
    });
  });
}
async function main(){
  assert.equal(await httpStatus("/",ORIGIN),404,
    "Unknown route must stay non-discoverable");
  console.log("PASS: unknown URL is rejected (404)");
  assert.equal(await httpStatus("/v1/trusted/"+"a".repeat(64),
    "https://invalid.test"),403,
    "Cross-site Origin must not be authorized");
  console.log("PASS: unauthorized origin is rejected (403)");
  assert.equal(await httpStatus("/v1/trusted/"+"a".repeat(64),
    ORIGIN),426,"Expected WebSocket upgrade, not ordinary REST response");
  console.log("PASS: no HTTP transport bypass (426)");
  await liveSignedOwnerHandshake();
  console.log("PASS: real Cloudflare staging WSS challenge + ECDSA owner handshake");
  console.log("STAGING_SMOKE_PASS: no calls, saved friends, push, SDP or media were transmitted");
}
main().catch(error=>{console.error("STAGING_SMOKE_FAIL",error.message);
  process.exitCode=1;});
