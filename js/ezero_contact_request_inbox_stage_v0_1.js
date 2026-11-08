/* E-ZERO Friend-of-Friend contact request UI — opt-in staging only.
 * This file does not modify the verified WebRTC engine, trust database or
 * existing call QR. Incoming requests require a currently open owner tab.
 * Unless a separately configured isolated Worker is explicitly enabled,
 * NO network is contacted and no request/approval success is claimed.
 */
(()=>{
"use strict";
const params=new URLSearchParams(location.search);
if(params.get("contactStage")!=="1" && !location.hash.startsWith("#contact="))return;
const host=document.getElementById("ezeroForwardContactStage");
const protocol=window.EZERO_CONTACT_REFERRAL;
const cfg=window.EZERO_REFERRAL_INBOX_STAGE_CONFIG;
if(!host||!protocol)return;
const FP=/^[a-f0-9]{64}$/;
const ID=/^[a-f0-9]{32}$/;
const PROFILE="ezero_secure_connect_staging_local_profile_v0_1";
const $=id=>document.getElementById(id);
const lang=()=>["ur","en","ar"].includes(document.documentElement.lang)?document.documentElement.lang:"ur";
const words={
 ur:{title:"🔐 تیسرے دوست کی محفوظ رابطہ درخواست — آزمائشی",
   intro:"لنک کھولنے سے دوستی یا کال شروع نہیں ہوتی۔ مالک کی واضح منظوری ضروری ہے، اور اس کا صفحہ کھلا ہونا چاہیے۔",
   owner:"✓ رابطہ درخواستیں وصول کریں",disable:"■ وصولی بند کریں",
   visitor:"↗ اس رابطے کے مالک کو درخواست بھیجیں",yes:"✓ قبول کریں",no:"✕ مسترد کریں",
   privacy:"میں اس درخواست کے مالک سے اپنا منتخب نام اور ڈیجیٹل شناخت شیئر کرنے کی منظوری دیتا ہوں۔",
   off:"درخواست سرور ابھی فعال نہیں؛ رابطہ لنک موجود ہے لیکن اصل درخواست نہیں بھیجی جاسکتی۔",
   noProfile:"پہلے اپنی نام/تصویر والی پروفائل اور محفوظ ڈیوائس شناخت مکمل کریں۔",
   noConsent:"نام اور ڈیجیٹل شناخت بھیجنے کی اجازت منتخب کریں۔",
   invalid:"یہ رابطہ خراب یا ختم شدہ ہے، درخواست نہیں بھیجی گئی۔",
   blocked:"بلاک کردہ رابطے کو درخواست نہیں بھیجی جا سکتی۔",
   connected:"✓ درخواستوں کی وصولی فعال ہے — صفحہ کھلا رکھیں۔",
   incoming:"نئی رابطہ درخواست",receiving:"رابطہ درخواست کو جانچ کر مالک کے سامنے دکھایا گیا۔",
   requested:"درخواست مالک کے کھلے صفحے کو بھیج دی گئی؛ جواب کا انتظار ہے۔",
   approved:"✓ مالک نے رابطہ درخواست قبول کی۔ محفوظ کال/دوستی کے لیے الگ دو طرفہ تصدیق ضروری ہے۔",
   rejected:"درخواست مسترد ہوئی۔",ownerAck:"فیصلہ سرور کو بھیجا گیا؛ وصولی کی تصدیق الگ ہوگی۔",
   approvalRecorded:"✓ آپ کا فیصلہ سرور میں وصول ہوا۔ یہ مستقل دوستی یا کال کی اجازت نہیں۔",
   network:"رابطہ ممکن نہیں۔ نیٹ ورک، براؤزر، اصل سرور یا اس کی اجازت چیک کریں۔",
   unavailable:"مالک اس وقت درخواستیں وصول نہیں کر رہا، یا درخواست کی اجازت دستیاب نہیں۔",
   rate:"بہت زیادہ درخواستیں۔ دوبارہ درخواست دینے سے پہلے وقفہ کریں۔",
   pending:"درخواست زیرِ جائزہ ہے؛ ابھی دوستی یا کال کی اجازت نہیں۔",
   close:"کنکشن بند ہوگیا۔ دوبارہ رابطہ صرف آپ کے بٹن سے شروع ہوگا۔"},
 en:{title:"🔐 Friend-of-friend approval — test only",
   intro:"A forwarded link does not grant calling or friendship. The owner must approve while their tab is open.",
   owner:"✓ Receive contact requests",disable:"■ Stop receiving",
   visitor:"↗ Ask this contact owner to connect",yes:"✓ Approve",no:"✕ Reject",
   privacy:"I agree to share my self-declared name and device identifier with this contact owner.",
   off:"Contact request server is not enabled. No real request can be sent yet.",
   noProfile:"Save your name/photo profile and durable device identity first.",
   noConsent:"Confirm sharing your name and device ID for this request.",
   invalid:"Expired or invalid contact. No request sent.",
   blocked:"A blocked contact cannot be requested.",
   connected:"✓ Incoming requests enabled. Keep this tab open.",
   incoming:"Incoming contact request",receiving:"An incoming request was rendered for your review.",
   requested:"Request reached the owner's open tab transport; awaiting their reply.",
   approved:"✓ Owner approved this request. Friendship and calls still require separate mutual verification.",
   rejected:"Request denied.",ownerAck:"Decision submitted; awaiting receipt.",
   approvalRecorded:"✓ Server acknowledged your decision. This is not friend or call authorization.",
   network:"Connection unavailable. Check network, browser, server or consent.",
   unavailable:"The owner is not receiving requests, or the service is unavailable.",
   rate:"Too many requests; try again later.",
   pending:"Awaiting review. No friendship or calling access has been granted.",
   close:"Connection closed. Reconnection requires a fresh button tap."},
 ar:{title:"🔐 طلب اتصال من صديق صديق — تجريبي",
   intro:"الرابط لا يتيح المكالمات أو الصداقة تلقائياً؛ موافقة المالك مطلوبة مع فتح صفحته.",
   owner:"✓ استقبال طلبات الاتصال",disable:"■ إيقاف الاستقبال",
   visitor:"↗ إرسال طلب اتصال إلى صاحب الرابط",yes:"✓ قبول",no:"✕ رفض",
   privacy:"أوافق على مشاركة اسمي المعلن ومعرّف جهازي مع صاحب الرابط.",
   off:"خادم الطلبات غير مفعّل بعد؛ لم يتم إرسال أي طلب.",
   noProfile:"احفظ اسمك وصورتك وهويتك الدائمة أولاً.",
   noConsent:"يجب الموافقة قبل إرسال الاسم والهوية.",
   invalid:"رابط غير صالح أو منتهٍ؛ لم يرسل الطلب.",
   blocked:"لا يمكنك إرسال طلب إلى جهة محظورة.",
   connected:"✓ استقبال الطلبات فعال؛ أبق الصفحة مفتوحة.",
   incoming:"طلب اتصال جديد",receiving:"ظهر الطلب لصاحب الرابط للمراجعة.",
   requested:"وصل الطلب إلى اتصال صاحب الرابط؛ ننتظر رده.",
   approved:"✓ وافق المالك على الطلب؛ الصداقة والمكالمات تحتاجان تحققاً مستقلاً.",
   rejected:"رُفض الطلب.",ownerAck:"أُرسل القرار؛ ننتظر تأكيد الاستلام.",
   approvalRecorded:"✓ استلم الخادم قرارك، دون تفعيل الصداقة أو الاتصال.",
   network:"تعذر الاتصال. تحقق من الشبكة والصفحة والخادم.",
   unavailable:"المالك غير متصل أو الخدمة غير متاحة.",
   rate:"طلبات كثيرة؛ حاول لاحقاً.",
   pending:"بانتظار المراجعة، دون صلاحيات اتصال.",
   close:"انقطع الاتصال؛ يلزم ضغط الزر لإعادة المحاولة."}
};
const t=k=>(words[lang()]||words.ur)[k]||k;
const el=(tag,id)=>{const x=document.createElement(tag);if(id)x.id=id;return x;};
const root=el("section","ezeroReferralInboxPilot");
root.style.cssText="padding:12px 14px;border:1px solid #477b59;border-radius:12px;margin:12px 0;background:#0d3022;color:#f0ffef;line-height:1.55";
const head=el("h3");const intro=el("p");
const owner=el("button","ezeroReferralListen");
const stop=el("button","ezeroReferralStop");stop.hidden=true;
const consentRow=el("label");consentRow.style.display="block";
const agree=el("input","ezeroReferralSenderConsent");agree.type="checkbox";agree.checked=false;
const agreeText=el("span");consentRow.append(agree,agreeText);
const visitor=el("button","ezeroReferralSend");
const received=el("div","ezeroReferralReceived");
const status=el("p","ezeroReferralStatus");
status.setAttribute("role","status");status.setAttribute("aria-live","polite");
root.append(head,intro,owner,stop,consentRow,visitor,received,status);
host.append(root);
let ownerSocket=null, visitorSocket=null, connecting=false;
const requests=new Map();
function state(key){status.textContent=t(key);status.dataset.code=key;}
function label(){
 head.textContent=t("title");intro.textContent=t("intro");
 owner.textContent=t("owner");stop.textContent=t("disable");
 visitor.textContent=t("visitor");agreeText.textContent=t("privacy");
 for(const [id,entry] of requests){
  entry.title.textContent=t("incoming")+" · "+entry.name+" · "+entry.from.slice(0,12)+"…";
  entry.accept.textContent=t("yes");entry.reject.textContent=t("no");
 }
 if(cfg?.enabled!==true)state("off");
}
function activeConfig(){
 if(cfg?.enabled!==true||location.protocol!=="https:"||window.isSecureContext!==true)return false;
 if(cfg.allowedOrigin!==location.origin||typeof cfg.wsOrigin!=="string")return false;
 try{
  const u=new URL(cfg.wsOrigin);
  return u.protocol==="wss:"&&!u.username&&!u.password&&!u.search&&!u.hash&&
    (u.pathname==="/"||u.pathname==="")&&
    (!u.port||u.port==="443")&&!!u.hostname;
 }catch(_){return false;}
}
function profile(){
 try{
  const p=JSON.parse(localStorage.getItem(PROFILE)||"null");
  return p?.share===true&&typeof p.name==="string"&&p.name.trim().length>0&&
    p.name.length<=40?p:null;
 }catch(_){return null;}
}
async function identity(){
 const store=window.EZERO_DEVICE_IDENTITY_STORE;
 const p=profile();
 if(!p||!store?.read)throw Error("NO_PROFILE");
 const id=await store.read();
 if(!id?.keys?.privateKey||id.keys.privateKey.extractable!==false||
    id.keys.privateKey.algorithm?.name!=="ECDSA"||
    id.keys.privateKey.algorithm?.namedCurve!=="P-256"||
    !FP.test(id.fingerprint||"")||typeof id.spki!=="string")
   throw Error("NO_PROFILE");
 return {id,p};
}
function wsUrl(target){
 if(!FP.test(target)||!activeConfig())throw Error("STAGING_DISABLED");
 return cfg.wsOrigin+"/v1/contact-requests/"+target;
}
function signed(id,role,challenge,target){
 const m=["EZERO-CONTACT-REQUEST-INBOX-1",location.origin,target,role,
   id.fingerprint,challenge.nonce,String(challenge.opened)].join("\n");
 return crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},id.keys.privateKey,new TextEncoder().encode(m));
}
function b64(bytes){
 let raw="";for(const b of bytes)raw+=String.fromCharCode(b);
 return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function open(role,target,id,onMessage){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(wsUrl(target));
  let step="challenge",done=false;
  const timer=setTimeout(()=>fail("NETWORK_TIMEOUT"),15000);
  const fail=code=>{
    if(!done){done=true;clearTimeout(timer);reject(Error(code));}
    try{ws.close();}catch(_){}
  };
  ws.addEventListener("message",async ev=>{
    if(typeof ev.data!=="string"||ev.data.length>1900)return fail("FRAME_INVALID");
    let m;try{m=JSON.parse(ev.data);}catch(_){return fail("BAD_JSON");}
    if(!m||typeof m!=="object"||Array.isArray(m))return fail("FRAME_INVALID");
    if(m.t==="challenge"&&step==="challenge"){
      if(m.target!==target||!(/^[A-Za-z0-9_-]{32}$/.test(m.nonce||""))||
         !Number.isSafeInteger(m.opened)||m.expires-m.opened!==20000||
         m.expires<=Date.now()||Math.abs(Date.now()-m.opened)>30000)
        return fail("BAD_CHALLENGE");
      step="ready";
      try{
        const sig=await signed(id,role,m,target);
        if(ws.readyState!==WebSocket.OPEN)return fail("CLOSED");
        ws.send(JSON.stringify({t:"hello",role,fp:id.fingerprint,
          pub:id.spki,sig:b64(new Uint8Array(sig))}));
      }catch(_){fail("SIGN_FAILED");}
      return;
    }
    if(m.t==="ready"&&step==="ready"&&m.role===role){
      step="active";done=true;clearTimeout(timer);resolve(ws);return;
    }
    if(step==="active")onMessage(ws,m);
    else if(m.t==="error")fail(m.code||"AUTH_FAILED");
    else fail("UNEXPECTED_FRAME");
  });
  ws.addEventListener("error",()=>{if(!done)fail("NETWORK_ERROR");else state("network");});
  ws.addEventListener("close",()=>{
    if(!done)fail("CLOSED");
    else if(role==="owner"&&ownerSocket===ws){ownerSocket=null;stop.hidden=true;owner.disabled=false;state("close");}
    else if(role==="visitor"&&visitorSocket===ws){visitorSocket=null;state("close");}
  });
 });
}
function incoming(ws,m){
 if(m.t==="decision-recorded"){state("approvalRecorded");return;}
 if(m.t!=="contact-request"||!ID.test(m.id||"")||
    !FP.test(m.from||"")||typeof m.name!=="string"||m.name.length>40||
    requests.has(m.id))return;
 const line=el("div");line.style.cssText="border-top:1px solid #487960;padding:10px 0";
 const title=el("p");
 const accept=el("button"),reject=el("button");
 const item={title,accept,reject,from:m.from,name:m.name};requests.set(m.id,item);
 title.textContent=t("incoming")+" · "+m.name+" · "+m.from.slice(0,12)+"…";
 accept.textContent=t("yes");reject.textContent=t("no");
 for(const [btn,approved] of [[accept,true],[reject,false]]){
   btn.type="button";
   btn.addEventListener("click",()=>{
     if(ws.readyState!==WebSocket.OPEN)return state("network");
     ws.send(JSON.stringify({t:"decision",id:m.id,approve:approved}));
     accept.disabled=true;reject.disabled=true;
     state("ownerAck");
   });
 }
 line.append(title,accept,reject);received.prepend(line);
 status.textContent=t("receiving");
}
async function listen(){
 if(connecting||ownerSocket?.readyState===WebSocket.OPEN)return;
 if(!activeConfig())return state("off");
 connecting=true;owner.disabled=true;
 try{
  const {id}=await identity();
  const ws=await open("owner",id.fingerprint,id,incoming);
  ownerSocket=ws;stop.hidden=false;state("connected");
 }catch(_){owner.disabled=false;state("noProfile");}
 finally{connecting=false;}
}
function disable(){
 if(ownerSocket){try{ownerSocket.close(1000,"owner-disabled");}catch(_){}}
 ownerSocket=null;owner.disabled=false;stop.hidden=true;requests.clear();received.replaceChildren();
 state("close");
}
async function ask(){
 if(connecting||visitorSocket?.readyState===WebSocket.OPEN)return state("pending");
 if(!activeConfig())return state("off");
 if(!agree.checked)return state("noConsent");
 let contact;
 try{
  const url=new URL(location.href);
  if(!/^#contact=[A-Za-z0-9_-]+$/.test(url.hash))throw Error("NO_CONTACT");
  url.search="";
  contact=await protocol.verify(url.href,{expectedOrigin:location.origin});
  if(window.EZERO_FRIEND_ACCESS?.isBlocked?.(contact.fp))return state("blocked");
 }catch(_){return state("invalid");}
 connecting=true;visitor.disabled=true;
 try{
   const {id,p}=await identity();
   if(id.fingerprint===contact.fp)return state("invalid");
   const ws=await open("visitor",contact.fp,id,(_ws,m)=>{
     if(m.t==="pending")state("pending");
     else if(m.t==="decision")state(m.approved===true?"approved":"rejected");
     else if(m.t==="error")state(["NOT_AVAILABLE"].includes(m.code)?"unavailable":
         ["COOLDOWN","RATE_LIMIT"].includes(m.code)?"rate":"network");
   });
   visitorSocket=ws;
   const random=new Uint8Array(16);crypto.getRandomValues(random);
   const requestId=Array.from(random,b=>b.toString(16).padStart(2,"0")).join("");
   ws.send(JSON.stringify({t:"request",id:requestId,
     name:p.name.trim(),card:location.hash.slice("#contact=".length)}));
   state("pending");
 }catch(_){state("network");visitor.disabled=false;}
 finally{connecting=false;}
}
owner.addEventListener("click",()=>void listen());
stop.addEventListener("click",disable);
visitor.addEventListener("click",()=>void ask());
$("language")?.addEventListener("change",label);
window.addEventListener("pagehide",()=>{
  if(ownerSocket)try{ownerSocket.close(1000,"page-leave");}catch(_){}
  if(visitorSocket)try{visitorSocket.close(1000,"page-leave");}catch(_){}
});
label();
})();