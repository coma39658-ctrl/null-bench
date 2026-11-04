/*
 * E-ZERO Secure Connect: opt-in device-local named fingerprint list.
 * Stores ONLY name and SHA-256 public-key fingerprint, never QR token,
 * signature, SDP, IP, message, media, call metadata, camera image, or secret key.
 * No uploads, no network, no automatic access to address book.
 * New sessions must VERIFY a fresh signed QR; saved names are not live accounts.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const STORAGE_KEY="ezero_secure_connect_local_fingerprints_v0_1";
  const MAX_CONTACTS=50;
  const dict={
    ur:{
      contactsTitle:"میرے دوست",contactsPrivacy:"صرف نام اور SHA-256 فنگرپرنٹ اس براؤزر میں محفوظ ہوتا ہے۔ کوئی تصویر یا گفتگو سرور کو نہیں بھیجی جاتی؛ نئے سیشن میں دستخط شدہ QR دوبارہ چیک کریں۔",
      friendName:"دوست کا نام",saveFriend:"✓ تصدیق شدہ دوست محفوظ کریں",findFriend:"دوست تلاش کریں",
      friendsEmpty:"ابھی کوئی دوست شامل نہیں۔ پہلے درست دستخط شدہ QR یا شناختی میسج کی تصدیق کریں۔",
      saved:"✓ دوست اس براؤزر میں محفوظ ہوگیا۔ مستقل آن لائن اکاؤنٹ نہیں۔",
      updated:"✓ دوست کا نام اپ ڈیٹ ہوگیا۔",
      notVerified:"پہلے دوست کا درست دستخط شدہ QR اسکین یا شناختی میسج چیک کریں؛ صرف فنگرپرنٹ کافی نہیں۔",
      needName:"دوست کا نام لکھیں (زیادہ سے زیادہ 40 حروف)۔",
      storageBlocked:"براؤزر نے مقامی اسٹوریج بند رکھا ہے؛ دوست محفوظ نہیں ہوسکا۔",
      storageFull:"اس فون میں زیادہ سے زیادہ 50 دوست رکھے جاسکتے ہیں؛ پہلے کوئی غیرضروری دوست ہٹائیں۔",
      removed:"دوست کی مقامی شناخت ہٹا دی گئی؛ دوسرے فون پر اس کا کوئی اثر نہیں۔",
      select:"شناخت منتخب کریں",remove:"ہٹائیں",selected:"محفوظ فنگرپرنٹ منتخب ہوا؛ دوبارہ دستخط شدہ QR یا شناختی میسج سے تصدیق کریں۔ کال خودکار شروع نہیں ہوئی۔",
      zero:"کوئی دوست ابھی محفوظ نہیں۔",noResults:"اس نام یا SHA-256 سے کوئی دوست نہیں ملا۔",
      cached:"صرف اس فون میں محفوظ — اس سیشن میں دوبارہ تصدیق درکار ہے۔",
      yourDevice:"صرف اس براؤزر میں",count:"دوست"
    },
    en:{
      contactsTitle:"My friends",contactsPrivacy:"Only names and SHA-256 fingerprints are saved in this browser. No photo or conversation is sent to a server by this feature. Verify a fresh signed QR in each new session.",
      friendName:"Friend's name",saveFriend:"✓ Save verified friend",findFriend:"Search friends",
      friendsEmpty:"No friends yet. First verify a valid signed QR or identity message.",
      saved:"✓ Friend saved in this browser only. Not a permanent online account.",
      updated:"✓ Friend name updated.",
      notVerified:"Verify a fresh signed QR or identity message first; a bare fingerprint is not enough.",
      needName:"Enter a friend's name (up to 40 characters).",
      storageBlocked:"Browser blocked local storage. Friend was not saved.",
      storageFull:"This browser can keep up to 50 friends. Remove an old contact first.",
      removed:"Local friend entry removed; nothing changed on the other phone.",
      select:"Select fingerprint",remove:"Remove",selected:"Saved fingerprint selected. Re-verify a fresh signed QR or ID before calling; no call was started.",
      zero:"No contacts saved yet.",noResults:"No friend matches this name or SHA-256.",
      cached:"Saved on this device only — re-verification required for new session.",
      yourDevice:"In this browser only",count:"friends"
    },
    ar:{
      contactsTitle:"أصدقائي",contactsPrivacy:"يُحفظ الاسم وبصمة SHA-256 فقط في هذا المتصفح. لا تُرسل الصور أو المحادثات إلى خادم عبر هذه الميزة. تحقّق من QR موقّع جديد في كل جلسة.",
      friendName:"اسم الصديق",saveFriend:"✓ حفظ الصديق المتحقق منه",findFriend:"البحث عن صديق",
      friendsEmpty:"لا يوجد أصدقاء بعد. تحقّق أولاً من QR موقّع أو رسالة هوية صحيحة.",
      saved:"✓ حُفظ الصديق في هذا المتصفح فقط، وليس حساباً دائماً على الإنترنت.",
      updated:"✓ تم تحديث اسم الصديق.",
      notVerified:"تحقّق أولاً من QR موقّع جديد أو رسالة الهوية؛ البصمة وحدها لا تكفي.",
      needName:"أدخل اسم الصديق (حتى 40 حرفاً).",
      storageBlocked:"منع المتصفح التخزين المحلي. لم يُحفظ الصديق.",
      storageFull:"يمكن حفظ 50 صديقاً كحد أقصى على هذا الجهاز. احذف غير الضروري أولاً.",
      removed:"حُذفت هوية الصديق محلياً؛ لا تغيير في الهاتف الآخر.",
      select:"اختيار البصمة",remove:"إزالة",selected:"اختيرت البصمة المحفوظة. أعد التحقق من QR أو هوية موقّعة قبل الاتصال. لم تبدأ مكالمة.",
      zero:"لا يوجد أصدقاء محفوظون.",noResults:"لا توجد نتيجة بهذا الاسم أو بصمة SHA-256.",
      cached:"محفوظ على هذا الجهاز فقط — يجب إعادة التحقق في جلسة جديدة.",
      yourDevice:"في هذا المتصفح فقط",count:"أصدقاء"
    }
  };
  const t=key=>(dict[document.documentElement.lang]||dict.ur)[key]||dict.ur[key]||key;
  const validFingerprint=s=>typeof s==="string" && /^[a-f0-9]{64}$/.test(s);
  const validName=s=>typeof s==="string" && s.trim().length>0 && s.trim().length<=40;
  const normalize=s=>s.trim().replace(/\s+/g," ").slice(0,40);
  let verifiedCandidate=null;
  let contacts=[];
  function safeRead(){
    try {
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return[];
      const decoded=JSON.parse(raw);
      if(!Array.isArray(decoded))return[];
      const out=[],used=new Set();
      for(const rec of decoded.slice(0,MAX_CONTACTS)){
        if(!rec || !validFingerprint(rec.fp) || !validName(rec.name) || used.has(rec.fp))continue;
        used.add(rec.fp);out.push({fp:rec.fp,name:normalize(rec.name)});
      }
      return out;
    }catch(_){return[];}
  }
  function safeWrite(items){
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(items.map(x=>({name:x.name,fp:x.fp}))));
      return true;
    }catch(_){return false;}
  }
  function announce(key){$("friendsStatus").textContent=t(key);}
  function monogram(name){
    const units=Array.from(name.trim());
    return (units[0]||"E").toLocaleUpperCase();
  }
  function el(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function render(){
    const box=$("friendsList");
    box.replaceChildren();
    const search=$("friendSearch").value.trim().toLocaleLowerCase();
    const filtered=contacts.filter(c=>c.name.toLocaleLowerCase().includes(search)||c.fp.includes(search));
    if(!filtered.length){
      box.appendChild(el("p","friends-placeholder",t(contacts.length?"noResults":"zero")));
      return;
    }
    for(const friend of filtered){
      const row=el("article","friend-entry");
      const avatar=el("span","friend-letter",monogram(friend.name));
      avatar.setAttribute("aria-hidden","true");
      const details=el("div","friend-details");
      details.appendChild(el("strong","friend-name",friend.name));
      details.appendChild(el("code","friend-fingerprint",friend.fp));
      details.appendChild(el("span","friend-note",t("cached")));
      const actions=el("div","friend-actions");
      const choose=el("button","friend-choose",t("select"));
      choose.type="button";
      choose.addEventListener("click",()=>{
        $("chooseRemote").click();
        $("friendIdInput").value=friend.fp;
        verifiedCandidate=null;
        $("saveVerifiedFriend").disabled=true;
        announce("selected");
        $("friendIdInput").focus();
      });
      const remove=el("button","friend-remove",t("remove"));
      remove.type="button";
      remove.addEventListener("click",()=>{
        const next=contacts.filter(x=>x.fp!==friend.fp);
        if(!safeWrite(next)){announce("storageBlocked");return;}
        contacts=next;render();announce("removed");
      });
      actions.append(choose,remove);
      row.append(avatar,details,actions);
      box.append(row);
    }
  }
  function translate(){
    for(const key of ["contactsTitle","contactsPrivacy","friendName","saveFriend","findFriend"]){
      const target=document.querySelector('[data-i18n="'+key+'"]');
      if(target)target.textContent=t(key);
    }
    if(!contacts.length)announce("friendsEmpty");
    render();
  }
  function updateEnabled(){
    $("saveVerifiedFriend").disabled=!(verifiedCandidate&&validName($("friendDisplayName").value));
  }
  contacts=safeRead();
  document.addEventListener("ezero:friend-verification",event=>{
    const e=event.detail||{};
    verifiedCandidate=e.ok===true && e.signed===true && validFingerprint(e.fingerprint)
      ? e.fingerprint : null;
    updateEnabled();
  });
  $("friendDisplayName").addEventListener("input",updateEnabled);
  $("saveVerifiedFriend").addEventListener("click",()=>{
    if(!verifiedCandidate){announce("notVerified");return;}
    const name=normalize($("friendDisplayName").value);
    if(!validName(name)){announce("needName");return;}
    const old=contacts.findIndex(x=>x.fp===verifiedCandidate);
    if(old<0 && contacts.length>=MAX_CONTACTS){announce("storageFull");return;}
    const next=contacts.slice();
    if(old>=0)next[old]={name,fp:verifiedCandidate};
    else next.unshift({name,fp:verifiedCandidate});
    if(!safeWrite(next)){announce("storageBlocked");return;}
    contacts=next;render();announce(old>=0?"updated":"saved");
    verifiedCandidate=null;updateEnabled();
    $("friendDisplayName").value="";
  });
  $("friendSearch").addEventListener("input",render);
  $("language").addEventListener("change",translate);
  translate();
})();