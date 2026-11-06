/* E-ZERO Secure Connect — mutual friend acceptance inside authenticated call.
 * No contact is added from opening or answering an invite. Both users
 * explicitly approve on their own handset; only the signed peer's observed
 * fingerprint, and a self-declared display name, stay on that handset.
 * No backend database, address book access, automatic permissions or polling.
 */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const panel=$("modernCallPanel");
 if(!document.body?.classList.contains("ezero-one-lab")||!panel)return;
 const copy={
   ur:{title:"👥 دوستوں میں شامل کریں",me:"آپ کا نام",add:"➕ فرینڈ ریکویسٹ بھیجیں",
      incoming:"آپ کو دوستی کی درخواست ملی ہے",accept:"✓ دوست قبول کریں",reject:"✕ مسترد کریں",
      idle:"پہلے محفوظ کال قائم کریں۔ دونوں کی منظوری کے بعد رابطہ Contacts میں محفوظ ہوگا۔",
      name:"پہلے اپنا نام لکھیں۔",waiting:"دوستی کی درخواست بھیجی گئی؛ دوسرے فون کی منظوری باقی ہے۔",
      requested:"دوست کی درخواست آئی ہے؛ قبول کرنے سے پہلے نام اور فرد کی تصدیق کریں۔",
      saved:"✓ دوست اسی فون کے Contacts میں محفوظ ہوگیا۔",
      already:"✓ یہ رابطہ پہلے سے Contacts میں موجود ہے۔",
      decline:"دوستی کی درخواست مسترد ہوگئی؛ کوئی رابطہ محفوظ نہیں ہوا۔",
      expired:"درخواست ختم ہوگئی؛ دوبارہ بھیجیں۔",
      failed:"دوست محفوظ نہیں ہوسکا۔ رابطے اور براؤزر اسٹوریج کی جانچ کریں۔"},
   en:{title:"👥 Add as a friend",me:"Your display name",add:"➕ Send friend request",
      incoming:"Incoming friend request",accept:"✓ Accept friend",reject:"✕ Decline",
      idle:"Connect securely first. A contact is saved only with mutual approval.",
      name:"Enter your display name first.",waiting:"Friend request sent; awaiting the other person's approval.",
      requested:"Friend request received. Verify the person before accepting.",
      saved:"✓ Friend saved in Contacts on this device.",already:"✓ This friend is already in Contacts.",
      decline:"Friend request declined. No contact was saved.",
      expired:"The request expired. Send a new one.",
      failed:"Could not save the contact. Check connection and browser storage."},
   ar:{title:"👥 إضافة صديق",me:"اسمك الظاهر",add:"➕ إرسال طلب صداقة",
      incoming:"طلب صداقة وارد",accept:"✓ قبول الصديق",reject:"✕ رفض",
      idle:"أنشئ اتصالاً آمناً أولاً. لا يُحفظ الصديق إلا بموافقة الطرفين.",
      name:"أدخل اسمك أولاً.",waiting:"أُرسل طلب الصداقة؛ بانتظار موافقة الطرف الآخر.",
      requested:"وصل طلب صداقة؛ تحقق من الشخص قبل القبول.",
      saved:"✓ حُفظ الصديق في جهات اتصال هذا الجهاز.",already:"✓ هذا الصديق محفوظ مسبقاً.",
      decline:"رُفض طلب الصداقة ولم يُحفظ أي اتصال.",
      expired:"انتهت صلاحية الطلب؛ أرسل طلباً جديداً.",
      failed:"تعذر حفظ الصديق؛ تحقق من الاتصال وتخزين المتصفح."}
 };
 const tr=k=>(copy[document.documentElement.lang]||copy.ur)[k]||k;
 const root=document.createElement("section");root.id="ezeroMutualFriends";
 root.className="ezero-mutual-friends";root.hidden=true;
 const title=document.createElement("strong");title.id="ezeroMutualTitle";
 const row=document.createElement("div");row.className="ezero-mutual-controls";
 const nameLabel=document.createElement("label");nameLabel.id="ezeroMyFriendNameLabel";
 const nameInput=document.createElement("input");nameInput.id="ezeroMyFriendName";
 nameInput.maxLength=40;nameInput.autocomplete="nickname";
 nameInput.type="text";nameLabel.append(nameInput);
 const add=document.createElement("button");add.id="ezeroSendFriendRequest";add.type="button";
 row.append(nameLabel,add);
 const request=document.createElement("div");request.id="ezeroFriendRequestPrompt";
 request.className="ezero-friend-request-prompt";request.hidden=true;
 const description=document.createElement("p");description.id="ezeroFriendRequestDescription";
 const accept=document.createElement("button");accept.id="ezeroAcceptFriendRequest";accept.type="button";
 const decline=document.createElement("button");decline.id="ezeroDeclineFriendRequest";decline.type="button";
 request.append(description,accept,decline);
 const status=document.createElement("small");status.id="ezeroMutualFriendStatus";
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 root.append(title,row,request,status);panel.append(root);
 let pending=null,incoming=null,timeout=null,statusKey="idle";
 const transport=()=>window.EZERO_FRIEND_TRANSPORT;
 const contacts=()=>window.EZERO_LOCAL_CONTACTS;
 const validName=v=>typeof v==="string"&&v.trim().length>0&&v.trim().length<=40;
 const validFP=v=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
 const safeName=v=>v.trim().replace(/\s+/g," ").slice(0,40);
 function myName(){return safeName(nameInput.value||"");}
 function connected(){return transport()?.connected()===true&&validFP(transport()?.peerFingerprint());}
 function report(k){statusKey=k;status.textContent=tr(k);}
 function clearPending(){pending=null;if(timeout){clearTimeout(timeout);timeout=null;}}
 function clearState(){
   clearPending();incoming=null;request.hidden=true;
   delete root.dataset.expanded;
   root.hidden=true;report("idle");
 }
 function redraw(){
   title.textContent=tr("title");nameLabel.childNodes.forEach(n=>{if(n.nodeType===3)n.remove();});
   nameLabel.insertBefore(document.createTextNode(tr("me")+" · "),nameInput);
   add.textContent=tr("add");accept.textContent=tr("accept");
   decline.textContent=tr("reject");
   if(incoming)description.textContent=tr("incoming")+" · "+incoming.name;
   status.textContent=tr(statusKey);
 }
 function refresh(){
   const hasCall=connected();
   root.hidden=!hasCall;
   if(!hasCall){clearState();return;}
   if(!nameInput.value&&$("ezeroMyName")?.value)
     nameInput.value=$("ezeroMyName").value.slice(0,40);
   const fp=transport().peerFingerprint();
   if(contacts()?.saved(fp) && !pending && !incoming)report("already");
 }
 add.addEventListener("click",()=>{
   if(!connected()||pending)return;
   const name=myName();
   if(!validName(name)){root.dataset.expanded="true";report("name");nameInput.focus();return;}
   const fp=transport().peerFingerprint();
   if(contacts()?.saved(fp)){report("already");return;}
   const bytes=crypto.getRandomValues(new Uint8Array(16));
   const id=Array.from(bytes,v=>v.toString(16).padStart(2,"0")).join("");
   if(!transport().send("friend-request",id,name)){report("failed");return;}
   pending={id,fp,created:Date.now()};
   delete root.dataset.expanded;
   report("waiting");
   timeout=setTimeout(()=>{clearPending();report("expired");},120000);
 });
 document.addEventListener("ezero:friend-control",event=>{
   if(!connected())return;
   const d=event.detail||{},fp=transport().peerFingerprint();
   if(d.peerFingerprint!==fp||!validFP(fp)||!validName(d.name))return;
   if(d.kind==="friend-request"){
     if(incoming)return;
     incoming={id:d.id,fp,name:safeName(d.name),created:Date.now()};
     request.hidden=false;redraw();report("requested");
   }else if(d.kind==="friend-response"&&pending &&
      pending.fp===fp&&pending.id===d.id&&Date.now()-pending.created<=120000){
     const accepted=d.accepted===true;
     clearPending();
     if(accepted){
       report(contacts()?.saveConnectedFriend(fp,safeName(d.name))?"saved":"failed");
     }else report("decline");
   }
 });
 accept.addEventListener("click",()=>{
   if(!connected()||!incoming)return;
   const response=incoming,own=myName(),fp=transport().peerFingerprint();
   if(!validName(own)){root.dataset.expanded="true";report("name");nameInput.focus();return;}
   if(response.fp!==fp || Date.now()-response.created>120000){
     incoming=null;request.hidden=true;report("expired");return;
   }
   if(!transport().send("friend-response",response.id,own,true)){
     report("failed");return;
   }
   incoming=null;request.hidden=true;
   report(contacts()?.saveConnectedFriend(fp,response.name)?"saved":"failed");
 });
 decline.addEventListener("click",()=>{
   if(!incoming||!connected())return;
   const response=incoming;
   const own=validName(myName())?myName():"E-ZERO";
   transport().send("friend-response",response.id,own,false);
   incoming=null;request.hidden=true;report("decline");
 });
 document.addEventListener("ezero:channel-state",e=>{
   if(e.detail?.connected)queueMicrotask(refresh);else clearState();
 });
 document.addEventListener("ezero:call-status",e=>{
   if(e.detail?.stage==="connected")queueMicrotask(refresh);
   else if(["idle","offline","iceNoRoute"].includes(e.detail?.stage))clearState();
 });
 document.addEventListener("ezero:friend-saved",refresh);
 $("language")?.addEventListener("change",redraw);
 window.addEventListener("pagehide",clearState);
 redraw();refresh();
})();
