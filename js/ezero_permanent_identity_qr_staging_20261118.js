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
if(!root||!home)return;
const words={
 ur:{title:"میرا مستقل QR",help:"یہ آپ کی مستقل ڈیجیٹل شناخت ہے۔ پہلی بار محفوظ کرنے پر نجی کلید اسی براؤزر کے محفوظ اسٹوریج میں رہے گی؛ QR میں صرف عوامی شناخت ہوگی۔",create:"میرا مستقل QR بنائیں",copy:"SHA-256 فنگرپرنٹ کاپی کریں",copyId:"مستقل شناختی کوڈ کاپی کریں",scan:"دوست کا مستقل QR اسکین کریں",gallery:"گیلری سے QR پڑھیں",cameraDenied:"کیمرے کی اجازت نہیں ملی؛ براؤزر کی Site settings میں Camera کی اجازت دیں۔",cameraError:"کیمرہ شروع نہیں ہو سکا؛ دوسری ایپ کا کیمرہ بند کرکے دوبارہ کوشش کریں۔",cameraMissing:"اس فون پر کیمرہ دستیاب نہیں۔",cameraActive:"کیمرہ کھل گیا ہے؛ دوست کا مستقل QR سامنے رکھیں۔",cameraStop:"اسکین بند کریں",galleryWorking:"تصویر میں QR تلاش ہو رہا ہے…",galleryError:"اس تصویر میں درست مستقل E-ZERO QR نہیں ملا۔",invalidQr:"یہ QR درست یا قابلِ تصدیق E-ZERO شناخت نہیں ہے۔",ready:"مستقل QR تیار ہے؛ اسی شناخت کو دوبارہ استعمال کریں۔",working:"محفوظ شناخت بن رہی ہے…",missing:"مستقل شناخت ابھی محفوظ نہیں۔ بٹن دبانے سے اسی موبائل کے براؤزر میں شناخت محفوظ ہوگی۔",error:"مستقل QR تیار نہیں ہوا۔ محفوظ اسٹوریج یا براؤزر سپورٹ چیک کریں۔",copied:"فنگرپرنٹ کاپی ہوگیا۔",copyFail:"فنگرپرنٹ کاپی نہیں ہوسکا۔",friendName:"دوست کا نام",saveFriend:"✓ دوست محفوظ کریں اور کال کی اجازت دیں",verified:"✓ مستقل QR درست ہے۔ اب دوست کا نام لکھ کر محفوظ کریں۔",saved:"دوست اس فون میں محفوظ ہوگیا۔",trustRequested:"دوست محفوظ؛ آنے والی کال کی اجازت کی درخواست بھیج دی گئی۔ دونوں صفحات کھلے رکھیں۔",savedCallsOff:"دوست محفوظ ہے، مگر آنے والی کال کی اجازت فعال نہیں ہوئی۔ دوستوں میں دوبارہ فعال کریں۔",self:"اپنے ہی QR کو دوست کے طور پر شامل نہیں کیا جاسکتا۔",saveError:"دوست محفوظ نہیں ہوا۔ براؤزر اسٹوریج چیک کریں۔"},
 en:{title:"My permanent QR",help:"This is your lasting digital identity. On first creation, the private key stays in this browser's protected storage; the QR contains public identity only.",create:"Create my permanent QR",copy:"Copy SHA-256 fingerprint",copyId:"Copy permanent identity code",scan:"Scan friend's permanent QR",gallery:"Scan QR from gallery",cameraDenied:"Camera permission was denied. Allow Camera in browser site settings.",cameraError:"The camera could not start. Close other camera apps and retry.",cameraMissing:"No camera is available on this phone.",cameraActive:"Camera is open. Point it at your friend’s permanent QR.",cameraStop:"Stop scanning",galleryWorking:"Reading the QR image…",galleryError:"No valid permanent E-ZERO QR was found in this image.",invalidQr:"This QR is not a valid or verifiable E-ZERO identity.",ready:"Permanent QR is ready. Reuse this same identity.",working:"Securing your device identity…",missing:"No permanent identity is saved yet. Tap the button to store this device identity in this browser.",error:"Permanent QR could not be created. Check secure browser storage and support.",copied:"Fingerprint copied.",copyFail:"Could not copy fingerprint.",friendName:"Friend name on this phone",saveFriend:"✓ Save friend & allow calls",verified:"✓ Permanent QR verified. Enter a local name and save this friend.",saved:"Friend saved on this phone.",trustRequested:"Friend saved; incoming-call permission request sent. Keep both app pages open.",savedCallsOff:"Friend saved, but incoming-call permission is not active. Enable it from Friends.",self:"You cannot add your own QR as a friend.",saveError:"Friend could not be saved. Check browser storage."},
 ar:{title:"رمز QR الدائم الخاص بي",help:"هذه هويتك الرقمية الثابتة. عند الإنشاء الأول يبقى المفتاح الخاص في التخزين المحمي للمتصفح؛ ويحتوي QR على الهوية العامة فقط.",create:"إنشاء رمز QR الدائم",copy:"نسخ بصمة SHA-256",copyId:"نسخ رمز الهوية الدائم",scan:"مسح QR الدائم للصديق",gallery:"قراءة QR من المعرض",cameraDenied:"تم رفض إذن الكاميرا. اسمح بالكاميرا من إعدادات الموقع في المتصفح.",cameraError:"تعذر تشغيل الكاميرا. أغلق تطبيقات الكاميرا الأخرى ثم أعد المحاولة.",cameraMissing:"لا توجد كاميرا متاحة على هذا الهاتف.",cameraActive:"الكاميرا مفتوحة؛ وجّهها نحو رمز QR الدائم للصديق.",cameraStop:"إيقاف المسح",galleryWorking:"جارٍ قراءة صورة QR…",galleryError:"لم يتم العثور على رمز E-ZERO دائم صالح في الصورة.",invalidQr:"رمز QR هذا ليس هوية E-ZERO صالحة أو قابلة للتحقق.",ready:"رمز QR الدائم جاهز؛ استخدم الهوية نفسها دائماً.",working:"جارٍ حفظ هوية الجهاز…",missing:"لم تُحفظ هوية دائمة بعد. اضغط الزر لحفظ هوية هذا الهاتف في المتصفح.",error:"تعذر إنشاء QR الدائم. تحقق من التخزين الآمن ودعم المتصفح.",copied:"تم نسخ البصمة.",copyFail:"تعذر نسخ البصمة.",friendName:"اسم الصديق على هذا الهاتف",saveFriend:"✓ حفظ الصديق والسماح بالمكالمات",verified:"✓ تم التحقق من QR الدائم. اكتب اسماً محلياً ثم احفظ الصديق.",saved:"تم حفظ الصديق على هذا الهاتف.",trustRequested:"تم حفظ الصديق وإرسال طلب السماح بالمكالمات الواردة. أبقِ الصفحتين مفتوحتين.",savedCallsOff:"تم حفظ الصديق لكن استقبال المكالمات غير مفعّل. فعّله من قائمة الأصدقاء.",self:"لا يمكنك إضافة رمزك أنت كصديق.",saveError:"تعذر حفظ الصديق. تحقق من تخزين المتصفح."}
};
const t=k=>(words[document.documentElement.lang]||words.ur)[k];
const card=document.createElement("section");card.id="ezeroPermanentQrCard";card.className="ezero-permanent-qr-card";
const heading=document.createElement("h2");heading.id="ezeroPermanentQrHeading";
const help=document.createElement("p");help.id="ezeroPermanentQrHelp";
const create=document.createElement("button");create.type="button";create.id="ezeroCreatePermanentQr";
const qr=document.createElement("div");qr.id="ezeroPermanentQr";qr.hidden=true;qr.setAttribute("role","img");
const fingerprint=document.createElement("output");fingerprint.id="ezeroPermanentFingerprint";fingerprint.hidden=true;
const copy=document.createElement("button");copy.type="button";copy.id="ezeroCopyPermanentFingerprint";copy.hidden=true;
const copyId=document.createElement("button");copyId.type="button";copyId.id="ezeroCopyPermanentIdentity";copyId.hidden=true;
const scan=document.createElement("button");scan.type="button";scan.id="ezeroScanPermanentFriendQr";scan.hidden=false;
const camera=document.createElement("video");camera.id="ezeroPermanentFriendQrCamera";camera.hidden=true;camera.muted=true;camera.playsInline=true;camera.setAttribute("aria-label","Scan friend permanent QR with camera");camera.style.cssText="display:block;width:100%;max-width:420px;max-height:55vh;object-fit:contain;border-radius:14px;background:#111;margin:10px auto";
const stopScan=document.createElement("button");stopScan.type="button";stopScan.id="ezeroStopPermanentFriendQrCamera";stopScan.hidden=true;
const gallery=document.createElement("button");gallery.type="button";gallery.id="ezeroGalleryPermanentFriendQr";gallery.hidden=false;
const fileInput=document.createElement("input");fileInput.type="file";fileInput.accept="image/*";fileInput.hidden=true;
const friendForm=document.createElement("div");friendForm.id="ezeroPermanentFriendSaveForm";friendForm.hidden=true;
const friendNameLabel=document.createElement("label");friendNameLabel.htmlFor="ezeroPermanentFriendName";
const friendName=document.createElement("input");friendName.id="ezeroPermanentFriendName";friendName.type="text";friendName.maxLength=40;friendName.autocomplete="off";
const saveFriendButton=document.createElement("button");saveFriendButton.type="button";saveFriendButton.id="ezeroSavePermanentFriend";
friendForm.append(friendNameLabel,friendName,saveFriendButton);
const status=document.createElement("p");status.id="ezeroPermanentQrStatus";status.setAttribute("role","status");status.setAttribute("aria-live","polite");
card.append(heading,help,create,qr,fingerprint,copy,copyId,scan,camera,stopScan,gallery,fileInput,friendForm,status);home.append(card);
let pendingFriend=null;
let currentToken="";
const encoder=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("");
const b64url=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
function fromB64url(s){
 if(typeof s!=="string"||! /^[A-Za-z0-9_-]{50,240}$/.test(s))throw Error("BAD_KEY");
 const raw=atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
// Stable application identity: do not bind durable device QR keys to a temporary
// Render preview hostname. This canonical origin is the existing production app
// origin; staging and production builds share the same protocol identifier.
const IDENTITY_ORIGIN="https://coma39658-ctrl.github.io";
const canonical=(spki,fp)=>["EZERO-PERMANENT-IDENTITY-1",IDENTITY_ORIGIN,spki,fp].join("\n");
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
 qr.replaceChildren(svg);qr.hidden=false;currentToken=result.token;
 fingerprint.textContent=result.fingerprint;fingerprint.hidden=false;
 copy.hidden=false;copyId.hidden=false;scan.hidden=false;gallery.hidden=false;
 create.hidden=true;status.textContent=t("ready");
 const legacyQr=root.querySelector(".identity-card .qr-layout");
 if(legacyQr)legacyQr.hidden=true;
}
async function load(){
 try{
   if(!store||typeof store.read!=="function")throw Error("DEVICE_IDENTITY_STORE_NOT_LOADED");
   const row=await store.read();
   if(!row){status.textContent=t("missing");return;}
   status.textContent=t("working");
   render(await tokenForSavedIdentity());
 }catch(error){
   const reason=String(error?.name||error?.message||"UNKNOWN").replace(/[^A-Za-z0-9_-]/g,"").slice(0,36)||"UNKNOWN";
   console.error("[E-ZERO permanent QR restore]",error);
   status.textContent=t("error")+" ["+reason+"]";
 }
}
heading.textContent=t("title");help.textContent=t("help");create.textContent=t("create");copy.textContent=t("copy");
copyId.textContent=t("copyId");scan.textContent=t("scan");stopScan.textContent=t("cameraStop");gallery.textContent=t("gallery");friendNameLabel.textContent=t("friendName");saveFriendButton.textContent=t("saveFriend");
create.addEventListener("click",async()=>{
 create.disabled=true;status.textContent=t("working");
 try{
   if(!store||typeof store.read!=="function")throw Error("DEVICE_IDENTITY_STORE_NOT_LOADED");
   if(!control||typeof control.saveAfterConsent!=="function")throw Error("DEVICE_IDENTITY_CONTROL_NOT_LOADED");
   const saved=await control.saveAfterConsent();
   if(saved!==true)throw Error("DEVICE_IDENTITY_SAVE_FAILED");
   render(await tokenForSavedIdentity());
 }catch(error){
   const reason=String(error?.name||error?.message||"UNKNOWN").replace(/[^A-Za-z0-9_-]/g,"").slice(0,36)||"UNKNOWN";
   console.error("[E-ZERO permanent QR create]",error);
   status.textContent=t("error")+" ["+reason+"]";
 }
 finally{create.disabled=false;}
});
copy.addEventListener("click",async()=>{
 try{await navigator.clipboard.writeText(fingerprint.textContent);status.textContent=t("copied");}
 catch(_){status.textContent=t("copyFail");}
});
copyId.addEventListener("click",async()=>{
 try{await navigator.clipboard.writeText(currentToken);status.textContent=t("copied");}
 catch(_){status.textContent=t("copyFail");}
});
let cameraStream=null,cameraLoop=0,cameraGeneration=0;
function stopPermanentCamera(){
 cameraGeneration++;if(cameraLoop)clearTimeout(cameraLoop);cameraLoop=0;
 if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null;}
 camera.pause();camera.srcObject=null;camera.hidden=true;stopScan.hidden=true;scan.disabled=false;
}
stopScan.addEventListener("click",()=>{stopPermanentCamera();status.textContent=t("ready");});
scan.addEventListener("click",async()=>{
 // Scanning a friend QR must not depend on this phone having generated
 // its own QR first. The scanned token is independently signature-verified.
 if(!navigator.mediaDevices?.getUserMedia){status.textContent=t("cameraMissing");return;}
 stopPermanentCamera();const generation=cameraGeneration;
 scan.disabled=true;status.textContent=t("cameraActive");
 try{
  cameraStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"}}});
  if(generation!==cameraGeneration||document.hidden){stopPermanentCamera();return;}
  camera.srcObject=cameraStream;camera.hidden=false;stopScan.hidden=false;
  await camera.play();
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
  if(!ctx)throw Error("CANVAS");
  let detector=null;
  if(typeof window.BarcodeDetector==="function"){try{detector=new BarcodeDetector({formats:["qr_code"]});}catch(_){detector=null;}}
  const frame=async()=>{
   if(generation!==cameraGeneration||!cameraStream)return;
   try{
    let value="";
    if(detector){try{const found=await detector.detect(camera);value=String(found?.[0]?.rawValue||"");}catch(_){detector=null;}}
    if(!value&&typeof window.jsQR==="function"&&camera.videoWidth>0){
     const scale=Math.min(1,1000/Math.max(camera.videoWidth,camera.videoHeight));
     const w=Math.max(1,Math.round(camera.videoWidth*scale)),h=Math.max(1,Math.round(camera.videoHeight*scale));
     if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
     ctx.drawImage(camera,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h);
     value=String(window.jsQR(pixels.data,w,h,{inversionAttempts:"attemptBoth"})?.data||"");
    }
    if(value){
     stopPermanentCamera();
     if(!value.startsWith("EZERO2.")){status.textContent=t("galleryError");return;}
     try{
      const verified=await verifyToken(value);
      pendingFriend={token:value,fingerprint:verified.fingerprint};friendName.value="";friendForm.hidden=false;
      status.textContent=t("verified");friendName.focus();
     }catch(_){status.textContent=t("invalidQr");}
     return;
    }
   }catch(_){/* Keep scanning; transient frame decode errors are not camera failures. */}
   if(generation===cameraGeneration)cameraLoop=setTimeout(frame,220);
  };
  cameraLoop=setTimeout(frame,250);
 }catch(error){
  stopPermanentCamera();
  const name=String(error?.name||"");
  status.textContent=name==="NotAllowedError"||name==="SecurityError"?t("cameraDenied"):
   name==="NotFoundError"?t("cameraMissing"):t("cameraError");
 }
});
gallery.addEventListener("click",()=>fileInput.click());
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopPermanentCamera();});
window.addEventListener("pagehide",stopPermanentCamera);
fileInput.addEventListener("change",async()=>{
 const file=fileInput.files?.[0];fileInput.value="";
 if(!file)return;
 if(file.size>8*1024*1024||typeof createImageBitmap!=="function"){
   status.textContent=t("galleryError");return;
 }
 status.textContent=t("galleryWorking");
 let bitmap=null;
 try{
   bitmap=await createImageBitmap(file);
   let value="";
   if(typeof window.BarcodeDetector==="function"){
     try{
       const detector=new BarcodeDetector({formats:["qr_code"]});
       const codes=await detector.detect(bitmap);
       value=String(codes[0]?.rawValue||"");
     }catch(_){value="";}
   }
   // Android/browser fallback: decode locally with the already bundled jsQR.
   // Bound canvas dimensions and composite transparent screenshots on white.
   if(!value&&typeof window.jsQR==="function"){
     const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
     const canvas=document.createElement("canvas");
     canvas.width=Math.max(1,Math.round(bitmap.width*scale));
     canvas.height=Math.max(1,Math.round(bitmap.height*scale));
     const ctx=canvas.getContext("2d",{willReadFrequently:true});
     if(!ctx)throw Error("CANVAS_UNAVAILABLE");
     ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
     ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
     const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
     value=String(window.jsQR(pixels.data,canvas.width,canvas.height,{inversionAttempts:"attemptBoth"})?.data||"");
   }
   if(!value.startsWith("EZERO2."))throw Error("NO_PERMANENT_QR");
   // Keep gallery pairing on the same permanent-identity path as camera scan.
   // Never route an EZERO2 identity into the legacy temporary-ID verifier.
   const verified=await verifyToken(value);
   pendingFriend={token:value,fingerprint:verified.fingerprint};
   friendName.value="";
   friendForm.hidden=false;
   status.textContent=t("verified");
   friendName.focus();
 }catch(_){status.textContent=t("galleryError");}
 finally{try{bitmap?.close();}catch(_){}}
});
document.getElementById("language")?.addEventListener("change",()=>{
 heading.textContent=t("title");help.textContent=t("help");
 create.textContent=t("create");copy.textContent=t("copy");
 copyId.textContent=t("copyId");scan.textContent=t("scan");stopScan.textContent=t("cameraStop");gallery.textContent=t("gallery");
 friendNameLabel.textContent=t("friendName");saveFriendButton.textContent=t("saveFriend");
 if(!qr.hidden)status.textContent=t("ready");
 else if(!create.hidden)status.textContent=t("missing");
});
async function verifyToken(token){
 if(typeof token!=="string"||token.length>600)throw Error("BAD_ID");
 const parts=token.split(".");
 if(parts.length!==4||parts[0]!=="EZERO2"||
    !/^[A-Za-z0-9_-]{50,240}$/.test(parts[1])||
    !/^[a-f0-9]{64}$/.test(parts[2])||
    !/^[A-Za-z0-9_-]{80,120}$/.test(parts[3]))throw Error("BAD_ID");
 const row={spki:parts[1],fingerprint:parts[2]};
 await verifyProof(row,parts[3]);
 return {version:2,fingerprint:parts[2],spki:parts[1],verified:true,permanent:true};
}
async function saveFriend(token,name){
 const verified=await verifyToken(token);
 const local=await store.read();
 if(!local)throw Error("LOCAL_IDENTITY_NOT_SAVED");
 if(local.fingerprint===verified.fingerprint)throw Error("SELF_ID");
 if(window.EZERO_FRIEND_ACCESS?.isBlocked?.(verified.fingerprint)===true)throw Error("FRIEND_BLOCKED");
 const clean=String(name||"").trim().replace(/[\u0000-\u001f\u007f]/g,"").replace(/\s+/g," ").slice(0,40);
 if(!clean)throw Error("FRIEND_NAME_REQUIRED");
 let items=[];
 try{
   const raw=JSON.parse(localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]");
   if(!Array.isArray(raw))throw Error("BAD_FRIEND_STORE");
   items=raw.filter(x=>x&&/^[a-f0-9]{64}$/.test(x.fp)&&typeof x.name==="string"&&x.name.trim().length>0&&x.name.length<=40);
 }catch(_){throw Error("FRIEND_STORE_UNAVAILABLE");}
 const existing=items.find(x=>x.fp===verified.fingerprint);
 if(existing?.spki&&existing.spki!==verified.spki)throw Error("FRIEND_KEY_CHANGED");
 const next=items.filter(x=>x.fp!==verified.fingerprint);
 next.unshift({...existing,fp:verified.fingerprint,spki:verified.spki,identityVersion:2,
   name:clean,profileName:existing?.profileName||"",
   nickname:existing?.profileName?clean!==existing.profileName:true});
 if(next.length>50)next.length=50;
 try{localStorage.setItem("ezero_secure_connect_staging_fingerprints_v0_1",JSON.stringify(next));}
 catch(_){throw Error("FRIEND_STORE_UNAVAILABLE");}
 document.dispatchEvent(new CustomEvent("ezero:friend-local-saved",{
   detail:{fp:verified.fingerprint,permanentQr:true}
 }));
 let trustRequested=false;
 const lab=window.EZERO_TRUSTED_FRIEND_LAB;
 if(lab?.enabled?.()===true){
   try{await lab.openOwnerInbox();await lab.setFriendTrust(verified.fingerprint,true);trustRequested=true;}
   catch(_){trustRequested=false;}
 }
 return {saved:true,fingerprint:verified.fingerprint,trustRequested};
}
document.addEventListener("ezero:friend-verification",async event=>{
 const detail=event.detail||{};
 if(detail.ok!==true||detail.permanent!==true||typeof detail.token!=="string"){
   if(detail.source==="scan"||detail.source==="paste"){pendingFriend=null;friendForm.hidden=true;}
   return;
 }
 try{
   const verified=await verifyToken(detail.token);
   if(verified.fingerprint!==detail.fingerprint)throw Error("FINGERPRINT_MISMATCH");
   pendingFriend={token:detail.token,fingerprint:verified.fingerprint};
   friendName.value="";
   friendForm.hidden=false;
   status.textContent=t("verified");
 }catch(_){pendingFriend=null;friendForm.hidden=true;status.textContent=t("error");}
});
saveFriendButton.addEventListener("click",async()=>{
 if(!pendingFriend){status.textContent=t("error");return;}
 saveFriendButton.disabled=true;
 try{
   const result=await saveFriend(pendingFriend.token,friendName.value);
   friendForm.hidden=true;pendingFriend=null;
   status.textContent=result.trustRequested?t("trustRequested"):t("savedCallsOff");
 }catch(error){
   status.textContent=String(error?.message)==="SELF_ID"?t("self"):t("saveError");
 }finally{saveFriendButton.disabled=false;}
});
window.EZERO_PERMANENT_IDENTITY_QR=Object.freeze({
 async createAfterConsent(){
   if(!control||typeof control.saveAfterConsent!=="function")throw Error("DEVICE_IDENTITY_CONTROL_NOT_LOADED");
   if(!store||typeof store.read!=="function")throw Error("DEVICE_IDENTITY_STORE_NOT_LOADED");
   const saved=await control.saveAfterConsent();
   if(saved!==true)throw Error("DEVICE_IDENTITY_SAVE_FAILED");
   return tokenForSavedIdentity();
 },
 verify:verifyProof,verifyToken,saveFriend
});
void load();
})();