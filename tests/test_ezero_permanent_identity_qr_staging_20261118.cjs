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
function boot(){
 const home=new Element("section");
 const root={querySelector:s=>s===".ezero-simple-home"?home:null};
 const elements=new Map();
 const document={documentElement:{lang:"ur",dir:"rtl"},
   getElementById:id=>id==="ezeroUnifiedCard"?root:(elements.get(id)||null),
   createElement:tag=>new Element(tag,(id,el)=>elements.set(id,el))};
 const window={EZERO_DEVICE_IDENTITY_STORE:store,EZERO_DEVICE_IDENTITY_CONTROL:control,
   qrcode:()=>({addData:s=>{lastQr=s;},make(){},createSvgTag:()=>"<svg></svg>"})};
 const navigator={clipboard:{writeText:async()=>{}}};
 new Function("document","window","location","crypto","TextEncoder","btoa","atob","navigator",
   source)(document,window,{origin:"https://ezero-test.example"},crypto,TextEncoder,
   s=>Buffer.from(s,"binary").toString("base64"),s=>Buffer.from(s,"base64").toString("binary"),navigator);
 return {home,elements,window};
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
 await store.save(row.keys,row.spki,row.fingerprint);
 assert.equal(row.permanentProof,parts[3],"Saving a friend later must not erase the permanent proof");
 app=boot();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(lastQr,token1,"The same QR payload must survive reload unchanged");
 const changed=parts[3][0]==="A"?"B":"A";
 await assert.rejects(()=>app.window.EZERO_PERMANENT_IDENTITY_QR.verify(row,changed+parts[3].slice(1)),
   "Tampered permanent signature must fail closed");
 console.log("EZERO_PERMANENT_QR_CONSENT_STABLE_RELOAD_SHA256_SIGNATURE_TAMPER: PASS");
})().catch(error=>{console.error(error);process.exitCode=1;});
