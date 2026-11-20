const assert=require("node:assert/strict");
const {webcrypto}=require("node:crypto");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("js/ezero_android_binding_owner_approval_v1.js","utf8");
const fixtureText=fs.readFileSync("android/app/src/test/resources/ezero_android_browser_binding_golden_v1.properties","utf8");
const fixture=Object.fromEntries(fixtureText.split(/\r?\n/).filter(Boolean).map(line=>{const i=line.indexOf("=");return [line.slice(0,i),line.slice(i+1)];}));

const b64=b=>Buffer.from(b).toString("base64url");
const fp=async b=>Buffer.from(await webcrypto.subtle.digest("SHA-256",b)).toString("hex");

(async()=>{
 assert.equal(fixture.fixture,"EZERO_ANDROID_BROWSER_BINDING_GOLDEN_V1");
 const ownerSpki=Buffer.from(fixture["owner.spki"],"base64url");
 const androidSpki=Buffer.from(fixture["android.spki"],"base64url");
 assert.equal(await fp(ownerSpki),fixture["owner.fingerprint"]);
 assert.equal(await fp(androidSpki),fixture["android.fingerprint"]);
 const ownerPublic=await webcrypto.subtle.importKey("spki",ownerSpki,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
 const androidPublic=await webcrypto.subtle.importKey("spki",androidSpki,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
 assert.equal(androidPublic.algorithm.namedCurve,"P-256");
 assert.equal(fixture["owner.canonical"],["EZERO-PERMANENT-IDENTITY-1",fixture.origin,fixture["owner.spki"],fixture["owner.fingerprint"]].join("\n"));
 const ownerProofValid=await webcrypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},ownerPublic,
   Buffer.from(fixture["owner.proof.p1363"],"base64url"),new TextEncoder().encode(fixture["owner.canonical"]));
 assert.equal(ownerProofValid,true,"shared permanent EZERO2 proof must verify in WebCrypto");
 assert.equal(fixture["request.canonical"],[
   "EZERO-ANDROID-BIND-1",fixture.origin,fixture["owner.fingerprint"],fixture["android.spki"],
   fixture["android.fingerprint"],fixture["request.nonce"],fixture["request.issued"],
   fixture["request.expires"],"call-invite-only"].join("\n"));
 const approvalValid=await webcrypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},ownerPublic,
   Buffer.from(fixture["approval.signature.p1363"],"base64url"),
   new TextEncoder().encode(fixture["approval.domain"]+"\n"+fixture["request.canonical"]));
 assert.equal(approvalValid,true,"shared owner approval signature must verify in WebCrypto");
 const fixtureContext={window:{},crypto:webcrypto,TextEncoder,Uint8Array,Date:{now:()=>1800000001000},
   atob:s=>Buffer.from(s,"base64").toString("binary"),btoa:s=>Buffer.from(s,"binary").toString("base64")};
 vm.runInNewContext(source,fixtureContext);
 const fixtureParsed=fixtureContext.window.EZERO_ANDROID_BINDING_OWNER_APPROVAL_V1.parseRequest(fixture["request.canonical"]);
 assert.equal(fixtureParsed.ownerFp,fixture["owner.fingerprint"]);
 assert.equal(fixtureParsed.androidFp,fixture["android.fingerprint"]);
 assert.equal(fixtureParsed.capability,"call-invite-only");

 const ownerKeys=await webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
 const ownerSpki=new Uint8Array(await webcrypto.subtle.exportKey("spki",ownerKeys.publicKey));
 const ownerFp=await fp(ownerSpki);
 const proofMessage=["EZERO-PERMANENT-IDENTITY-1","https://coma39658-ctrl.github.io",b64(ownerSpki),ownerFp].join("\n");
 const proof=b64(await webcrypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},ownerKeys.privateKey,new TextEncoder().encode(proofMessage)));
 const androidKeys=await webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
 const androidSpki=new Uint8Array(await webcrypto.subtle.exportKey("spki",androidKeys.publicKey));
 const androidFp=await fp(androidSpki);
 const now=Math.floor(Date.now()/1000);
 const canonical=["EZERO-ANDROID-BIND-1","https://coma39658-ctrl.github.io",ownerFp,b64(androidSpki),androidFp,b64(webcrypto.getRandomValues(new Uint8Array(24))),String(now),String(now+60),"call-invite-only"].join("\n");
 const store={async read(){return {fingerprint:ownerFp,spki:b64(ownerSpki),permanentProof:proof,keys:ownerKeys};}};
 let confirmCalls=0;
 const window={EZERO_DEVICE_IDENTITY_STORE:store,confirm:()=>{confirmCalls++;return true;},EZERO_PERMANENT_IDENTITY_QR:{async verify(row,proof){const ok=await webcrypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},ownerKeys.publicKey,Buffer.from(proof,"base64url"),new TextEncoder().encode(proofMessage));if(!ok)throw Error("BAD_PERMANENT_PROOF");return true;}}};
 const context={window,crypto:webcrypto,TextEncoder,Uint8Array,Date,atob:s=>Buffer.from(s,"base64").toString("binary"),btoa:s=>Buffer.from(s,"binary").toString("base64")};
 vm.runInNewContext(source,context);
 const api=window.EZERO_ANDROID_BINDING_OWNER_APPROVAL_V1;
 assert.ok(api,"owner approval API is exposed");
 const parsed=api.parseRequest(canonical);
 assert.equal(parsed.capability,"call-invite-only");
 assert.equal(parsed.ownerFp,ownerFp);
 const signature=await api.approve(canonical);
 assert.equal(confirmCalls,1,"approval must require explicit owner confirmation");
 assert.equal(signature.protocol,"EZERO-ANDROID-BIND-APPROVAL-1");
 assert.equal(signature.ownerFingerprint,ownerFp);
 assert.equal(signature.androidFingerprint,androidFp);
 assert.equal(signature.nonce,parsed.nonce);
 const valid=await webcrypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},ownerKeys.publicKey,
   Buffer.from(signature.signatureBase64Url,"base64url"),
   new TextEncoder().encode("EZERO-ANDROID-BIND-APPROVAL-1\n"+canonical));
 assert.equal(valid,true,"signature must verify under the exact same EZERO2 owner public key");
 await assert.rejects(()=>api.approve(canonical),/CHALLENGE_REPLAYED/,"The same owner nonce must not be approved twice in one browser session");
 await assert.rejects(()=>api.approve(canonical.replace("call-invite-only","contacts-sync")),/REQUEST_SCOPE_MISMATCH/);
 await assert.rejects(()=>api.approve(canonical.replace(ownerFp,"0".repeat(64))),/OWNER_KEY_NOT_ENROLLED/);
 const expired=canonical.split("\n");expired[7]=String(now-1);
 await assert.rejects(()=>api.approve(expired.join("\n")),/REQUEST_EXPIRED_OR_INVALID/);
 const boundary=canonical.split("\n");boundary[7]=String(now);
 await assert.rejects(()=>api.approve(boundary.join("\n")),/REQUEST_EXPIRED_OR_INVALID/);
 const long=canonical.split("\n");long[7]=String(now+91);
 await assert.rejects(()=>api.approve(long.join("\n")),/REQUEST_EXPIRED_OR_INVALID/);
 window.confirm=()=>false;
 const declineRequest=canonical.replace(parsed.nonce,b64(webcrypto.getRandomValues(new Uint8Array(24))));
 await assert.rejects(()=>api.approve(declineRequest),/OWNER_APPROVAL_DECLINED/);
 console.log("EZERO2_SAME_OWNER_KEY_EXPLICIT_APPROVAL_SHORT_TTL_CALL_INVITE_ONLY: PASS");
})().catch(error=>{console.error(error);process.exitCode=1;});