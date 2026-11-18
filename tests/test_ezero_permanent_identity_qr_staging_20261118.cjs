const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto").webcrypto;
const source=fs.readFileSync("js/ezero_permanent_identity_qr_staging_20261118.js","utf8");
class Element{
  constructor(tag,register){this.tag=tag;this._register=register;this.children=[];this.listeners={};this.hidden=false;this.attributes={};this.textContent="";this.innerHTML="";}
  set id(value){this._id=value;this._register?.(value,this);}
  get id(){return this._id||"";}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  querySelector(sel){return sel==="svg"&&this.innerHTML.includes("<svg")?new Element("svg"):null;}
}
const encode=b=>Buffer.from(b).toString("base64url");
const decode=s=>new Uint8Array(Buffer.from(s,"base64url"));
let row=null,lastQr="";
const store={
 async read(){return row;},
 async save(keys,spki,fingerprint){
   const proof=row?.spki===spki&&row?.fingerprint===fingerprint?row.permanentProof:undefined;
   row={v:1,keys,spki,fingerprint,...(proof?{permanentProof:proof}:{})};return true;
 },
 async savePermanentProof(proof){row={...row,permanentProof:proof};return true;}
};
const control={async saveAfterConsent(){
 if(!row){
   const keys=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
   const bytes=new Uint8Array(await crypto.subtle.exportKey("spki",keys.publicKey));
   await store.save(keys,encode(bytes),Buffer.from(await crypto.subtle.digest("SHA-256",bytes)).toString("hex"));
 }else await store.save(row.keys,row.spki,row.fingerprint);
 return true;
}};
function boot(origin="https://ezero-test.example"){
 const home=new Element("section");
 const root={querySelector:s=>s===".ezero-simple-home"?home:null};
 const elements=new Map();
 const document={documentElement:{lang:"ur",dir:"rtl"},
   getElementById:id=>id==="ezeroUnifiedCard"?root:(elements.get(id)||null),
   createElement:tag=>new Element(tag,(id,el)=>elements.set(id,el))};
 const window={EZERO_DEVICE_IDENTITY_STORE:store,EZERO_DEVICE_IDENTITY_CONTROL:control,
   qrcode:()=>({addData:s=>{lastQr=s;},make(){},createSvgTag:()=>"<svg></svg>"})};
 const savedEvents=[],trustCalls=[],listeners={},pendingEvents=[];
 document.addEventListener=(type,fn)=>{(listeners[type]??=[]).push(fn);};
 document.dispatchEvent=event=>{for(const fn of listeners[event.type]||[]){const result=fn(event);if(result?.then)pendingEvents.push(result);}return true;};
 const local={};
 const localStorage={getItem:k=>local[k]??null,setItem:(k,v)=>{local[k]=String(v);}};
 const lab={enabled:()=>true,async openOwnerInbox(){trustCalls.push("open");return true;},
   async setFriendTrust(fp,allowed){trustCalls.push({fp,allowed});return true;}};
 window.EZERO_TRUSTED_FRIEND_LAB=lab;
 const navigator={clipboard:{writeText:async()=>{}}};
 class TestCustomEvent{constructor(type,opts){this.type=type;this.detail=opts?.detail;}}
 document.addEventListener("ezero:friend-local-saved",event=>savedEvents.push(event.detail));
 new Function("document","window","location","crypto","TextEncoder","btoa","atob","navigator","localStorage","CustomEvent",
   source)(document,window,{origin},crypto,TextEncoder,
   s=>Buffer.from(s,"binary").toString("base64"),s=>Buffer.from(s,"base64").toString("binary"),navigator,localStorage,TestCustomEvent);
 return {home,elements,window,document,localStorage,local,savedEvents,trustCalls,TestCustomEvent,pendingEvents};
}
(async()=>{
 let app=boot();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(row,null,"Page load must not persist a new identity without consent");
 const create=app.elements.get("ezeroCreatePermanentQr");
 assert.ok(create,"Permanent QR action is present");
 await create.listeners.click[0]();
 assert.ok(row?.permanentProof,"Stable proof is stored with the device key");
 assert.equal(app.elements.get("ezeroPermanentQr").hidden,false,"QR is shown only after successful rendering");
 const token1=lastQr,parts=token1.split(".");
 assert.equal(parts.length,4);
 assert.equal(parts[0],"EZERO2");
 assert.match(parts[2],/^[a-f0-9]{64}$/);
 assert.equal(parts[1],row.spki);
 assert.equal(parts[2],row.fingerprint);
 await app.window.EZERO_PERMANENT_IDENTITY_QR.verify(row,parts[3]);
 const parsed=await app.window.EZERO_PERMANENT_IDENTITY_QR.verifyToken(token1);
 assert.equal(parsed.permanent,true);
 assert.equal(parsed.fingerprint,row.fingerprint);
 await assert.doesNotReject(()=>app.window.EZERO_PERMANENT_IDENTITY_QR.verifyToken(token1),
   "Permanent QR must validate on its own origin");
 await store.save(row.keys,row.spki,row.fingerprint);
 assert.equal(row.permanentProof,parts[3],"Saving a friend later must not erase the permanent proof");
 app=boot();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(lastQr,token1,"The same QR payload must survive reload unchanged");
 const otherOrigin=boot("https://different-origin.example");
 await assert.rejects(()=>otherOrigin.window.EZERO_PERMANENT_IDENTITY_QR.verifyToken(token1),
   "Origin-bound identity QR must reject a different site origin");
 const changed=parts[3][0]==="A"?"B":"A";
 await assert.rejects(()=>app.window.EZERO_PERMANENT_IDENTITY_QR.verify(row,changed+parts[3].slice(1)),
   "Tampered permanent signature must fail closed");
 await assert.rejects(()=>app.window.EZERO_PERMANENT_IDENTITY_QR.saveFriend(token1,"Myself"),
   /SELF_ID/,"A user cannot save their own QR as a friend");
 const friendKeys=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
 const friendBytes=new Uint8Array(await crypto.subtle.exportKey("spki",friendKeys.publicKey));
 const friendSpki=encode(friendBytes);
 const friendFp=Buffer.from(await crypto.subtle.digest("SHA-256",friendBytes)).toString("hex");
 const message=["EZERO-PERMANENT-IDENTITY-1","https://ezero-test.example",friendSpki,friendFp].join("\n");
 const friendSig=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},friendKeys.privateKey,new TextEncoder().encode(message));
 const friendToken=["EZERO2",friendSpki,friendFp,encode(friendSig)].join(".");
 app.document.dispatchEvent(new app.TestCustomEvent("ezero:friend-verification",{detail:{
   ok:true,permanent:true,fingerprint:friendFp,token:friendToken,source:"scan"
 }}));
 await Promise.all(app.pendingEvents.splice(0));
 assert.equal(app.elements.get("ezeroPermanentFriendSaveForm").hidden,false,
   "A verified permanent QR reveals the explicit Save Friend action");
 app.elements.get("ezeroPermanentFriendName").value="  Friend   One  ";
 await app.elements.get("ezeroSavePermanentFriend").listeners.click[0]();
 const friends=JSON.parse(app.localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1"));
 assert.equal(friends[0].fp,friendFp);
 assert.equal(friends[0].spki,friendSpki);
 assert.equal(friends[0].identityVersion,2);
 assert.equal(friends[0].name,"Friend One");
 assert.equal(friends[0].nickname,true);
 assert.equal(app.trustCalls[0],"open");
 assert.deepEqual(app.trustCalls[1],{fp:friendFp,allowed:true});
 assert.equal(app.savedEvents[0].fp,friendFp);
 console.log("EZERO_PERMANENT_QR_CONSENT_STABLE_RELOAD_SIGNATURE_GALLERY_SAVE_TRUST: PASS");
})().catch(error=>{console.error(error);process.exitCode=1;});
