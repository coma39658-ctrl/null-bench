/* E-ZERO permanent device QR — isolated staging implementation.
 * Only the public SPKI key, SHA-256 fingerprint and stable proof-of-possession
 * signature are encoded. No private key, phone number, call token, SDP or ICE.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const root=$("ezeroUnifiedCard");
const home=root?.querySelector(".ezero-simple-home");
const store=window.EZERO_DEVICE_IDENTITY_STORE;
const control=window.EZERO_DEVICE_IDENTITY_CONTROL;
if(!root||!home||!store||!control)return;
const words={
 ur:{title:"میرا مستقل QR",help:"یہ آپ کی مستقل ڈیجیٹل شناخت ہے۔ پہلی بار محفوظ کرنے پر نجی کلید اسی براؤزر کے محفوظ اسٹوریج میں رہے گی؛ QR میں صرف عوامی شناخت ہوگی۔",create:"میرا مستقل QR بنائیں",copy:"SHA-256 فنگرپرنٹ کاپی کریں",ready:"مستقل QR تیار ہے؛ اسی شناخت کو دوبارہ استعمال کریں۔",working:"محفوظ شناخت بن رہی ہے…",missing:"مستقل شناخت ابھی محفوظ نہیں۔ بٹن دبانے سے اسی موبائل کے براؤزر میں شناخت محفوظ ہوگی۔",error:"مستقل QR تیار نہیں ہوا۔ محفوظ اسٹوریج یا براؤزر سپورٹ چیک کریں۔",copied:"فنگرپرنٹ کاپی ہوگیا۔",copyFail:"فنگرپرنٹ کاپی نہیں ہوسکا۔"},
 en:{title:"My permanent QR",help:"This is your lasting digital identity. On first creation, the private key stays in this browser's protected storage; the QR contains public identity only.",create:"Create my permanent QR",copy:"Copy SHA-256 fingerprint",ready:"Permanent QR is ready. Reuse this same identity.",working:"Securing your device identity…",missing:"No permanent identity is saved yet. Tap the button to store this device identity in this browser.",error:"Permanent QR could not be created. Check secure browser storage and support.",copied:"Fingerprint copied.",copyFail:"Could not copy fingerprint."},
 ar:{title:"رمز QR الدائم الخاص بي",help:"هذه هويتك الرقمية الثابتة. عند الإنشاء الأول يبقى المفتاح الخاص في التخزين المحمي للمتصفح؛ ويحتوي QR على الهوية العامة فقط.",create:"إنشاء رمز QR الدائم",copy:"نسخ بصمة SHA-256",ready:"رمز QR الدائم جاهز؛ استخدم الهوية نفسها دائماً.",working:"جارٍ حفظ هوية الجهاز…",missing:"لم تُحفظ هوية دائمة بعد. اضغط الزر لحفظ هوية هذا الهاتف في المتصفح.",error:"تعذر إنشاء QR الدائم. تحقق من التخزين الآمن ودعم المتصفح.",copied:"تم نسخ البصمة.",copyFail:"تعذر نسخ البصمة."}
};
const t=k=>(words[document.documentElement.lang]||words.ur)[k];
const card=document.createElement("section");card.id="ezeroPermanentQrCard";card.className="ezero-permanent-qr-card";
const heading=document.createElement("h2");heading.id="ezeroPermanentQrHeading";
const help=document.createElement("p");help.id="ezeroPermanentQrHelp";
const create=document.createElement("button");create.type="button";create.id="ezeroCreatePermanentQr";
const qr=document.createElement("div");qr.id="ezeroPermanentQr";qr.hidden=true;qr.setAttribute("role","img");
const fingerprint=document.createElement("output");fingerprint.id="ezeroPermanentFingerprint";fingerprint.hidden=true;
const copy=document.createElement("button");copy.type="button";copy.id="ezeroCopyPermanentFingerprint";copy.hidden=true;
const status=document.createElement("p");status.id="ezeroPermanentQrStatus";status.setAttribute("role","status");status.setAttribute("aria-live","polite");
card.append(heading,help,create,qr,fingerprint,copy,status);home.append(card);
const encoder=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("");
const b64url=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
function fromB64url(s){
 if(typeof s!=="string"||! /^[A-Za-z0-9_-]{50,240}$/.test(s))throw Error("BAD_KEY");
 const raw=atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
const canonical=(spki,fp)=>["EZERO-PERMANENT-IDENTITY-1",location.origin,spki,fp].join("\n");
async function verifyProof(row,proof){
 const bytes=fromB64url(row.spki);
 const fp=hex(await crypto.subtle.digest("SHA-256",bytes));
 if(fp!==row.fingerprint)throw Error("FINGERPRINT_MISMATCH");
 const pub=await crypto.subtle.importKey("spki",bytes,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
 const sig=Uint8Array.from(atob(proof.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-proof.length%4)%4)),c=>c.charCodeAt(0));
 if(!await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},pub,sig,encoder.encode(canonical(row.spki,fp))))
   throw Error("BAD_PERMANENT_SIGNATURE");
 return true;
}
async function tokenForSavedIdentity(){
 let row=await store.read();
 if(!row)throw Error("DEVICE_IDENTITY_NOT_SAVED");
 const pubBytes=new Uint8Array(await crypto.subtle.exportKey("spki",row.keys.publicKey));
 const spki=b64url(pubBytes),fp=hex(await crypto.subtle.digest("SHA-256",pubBytes));
 if(spki!==row.spki||fp!==row.fingerprint)throw Error("DEVICE_IDENTITY_MISMATCH");
 let proof=row.permanentProof;
 if(proof){await verifyProof(row,proof);}
 else{
   const signature=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},row.keys.privateKey,encoder.encode(canonical(spki,fp)));
   proof=b64url(signature);
   await store.savePermanentProof(proof);
   row=await store.read();
   if(row?.permanentProof!==proof)throw Error("PROOF_NOT_PERSISTED");
   await verifyProof(row,proof);
 }
 return {token:["EZERO2",spki,fp,proof].join("."),fingerprint:fp};
}
function render(result){
 if(typeof window.qrcode!=="function")throw Error("QR_LIBRARY_UNAVAILABLE");
 const maker=window.qrcode(0,"M");maker.addData(result.token);maker.make();
 const markup=maker.createSvgTag(5,12);
 const holder=document.createElement("div");holder.innerHTML=markup;
 const svg=holder.querySelector("svg");
 if(!svg)throw Error("QR_RENDER_FAILED");
 svg.setAttribute("role","img");svg.setAttribute("aria-label","E-ZERO permanent public identity QR");
 qr.replaceChildren(svg);qr.hidden=false;
 fingerprint.textContent=result.fingerprint;fingerprint.hidden=false;
 copy.hidden=false;create.hidden=true;status.textContent=t("ready");
}
async function load(){
 try{
   const row=await store.read();
   if(!row){status.textContent=t("missing");return;}
   status.textContent=t("working");
   render(await tokenForSavedIdentity());
 }catch(_){status.textContent=t("error");}
}
heading.textContent=t("title");help.textContent=t("help");create.textContent=t("create");copy.textContent=t("copy");
create.addEventListener("click",async()=>{
 create.disabled=true;status.textContent=t("working");
 try{
   const saved=await control.saveAfterConsent();
   if(saved!==true)throw Error("DEVICE_IDENTITY_SAVE_FAILED");
   render(await tokenForSavedIdentity());
 }catch(_){status.textContent=t("error");}
 finally{create.disabled=false;}
});
copy.addEventListener("click",async()=>{
 try{await navigator.clipboard.writeText(fingerprint.textContent);status.textContent=t("copied");}
 catch(_){status.textContent=t("copyFail");}
});
document.getElementById("language")?.addEventListener("change",()=>{
 heading.textContent=t("title");help.textContent=t("help");
 create.textContent=t("create");copy.textContent=t("copy");
 if(!qr.hidden)status.textContent=t("ready");
 else if(!create.hidden)status.textContent=t("missing");
});
window.EZERO_PERMANENT_IDENTITY_QR=Object.freeze({
 async createAfterConsent(){
   const saved=await control.saveAfterConsent();
   if(saved!==true)throw Error("DEVICE_IDENTITY_SAVE_FAILED");
   return tokenForSavedIdentity();
 },
 verify:verifyProof
});
void load();
})();