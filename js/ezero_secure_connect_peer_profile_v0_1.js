/* E-ZERO peer profile v0.1
 * Name and optional small JPEG avatar remain on this browser only until the
 * user opts in. Transfer is exclusively across a signed-peer-associated,
 * genuinely connected, encrypted WebRTC DataChannel. No server or account.
 * A self-declared picture/name is NOT proof of someone's real-world identity.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  if(!$("ezeroProfileEditor")||!$("ezeroPeerProfileCard"))return;
  const KEY="ezero_secure_connect_local_profile_v0_1";
  const PHOTO=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  const copy={
    ur:{"cameraPhoto":"📷 کیمرے سے تصویر لیں","galleryPhoto":"🖼️ گیلری سے منتخب کریں","photoHint":"کیمرہ صرف بٹن دبانے پر کھلے گا؛ تصویر کبھی خودکار اپ لوڈ نہیں ہوگی۔","photoReady":"✓ تصویر تیار ہے۔ پروفائل محفوظ کریں۔","yourPhoto":"پروفائل تصویر (اختیاری)",editProfile:"👤 میری E-ZERO پروفائل — نام اور تصویر",
      profilePrivacy:"نام اور تصویر صرف اس فون پر محفوظ رہیں گے؛ دونوں فون کے محفوظ رابطے اور آپ کی اجازت کے بعد ہی دوست کو بھیجے جائیں گے۔",
      yourName:"آپ کا نام",shareConsent:"میرا نام اور منتخب تصویر حقیقی کال کنکشن بننے پر دوست کو شیئر کرنے کی اجازت ہے؛ میں اسے بعد میں بند کرسکتا ہوں۔",
      saveProfile:"✓ پروفائل محفوظ کریں",profileLocal:"پروفائل ابھی صرف اس فون پر ہے۔",
      noProfile:"دوست نے ابھی پروفائل شیئر نہیں کی",verifiedConnection:"دونوں فون WebRTC پر کنیکٹ ہیں",
      selfDeclared:"نام/تصویر دوست نے خود فراہم کی ہیں؛ انسانی شناخت کی ضمانت نہیں۔",
      saved:"✓ پروفائل اس فون پر محفوظ ہے۔",sharing:"✓ محفوظ رابطے پر آپ کی منظور شدہ پروفائل شیئر ہوئی ہے۔",
      notSharing:"پروفائل محفوظ ہے، لیکن دوسرے فون کو شیئر نہیں ہوئی۔",
      invalid:"1 سے 40 حروف تک اپنا نام درج کریں۔",
      photoRejected:"یہ تصویر بہت بڑی، غیر معاون یا خراب ہے۔ JPEG، PNG یا WebP منتخب کریں۔",
      storeError:"اس براؤزر میں مقامی پروفائل محفوظ نہ ہو سکی۔",profileReceived:"دوست کی فراہم کردہ پروفائل",
      idPrefix:"تصدیق شدہ عارضی ڈیجیٹل آئی ڈی"},
    en:{"cameraPhoto":"📷 Take a photo","galleryPhoto":"🖼️ Choose from gallery","photoHint":"The camera opens only when you choose it. Photos are never automatically uploaded.","photoReady":"✓ Photo is ready. Save your profile.","yourPhoto":"Profile photo (optional)",editProfile:"👤 My E-ZERO profile — name & photo",
      profilePrivacy:"Your name and photo stay on this phone until you opt in and a verified call connection is established.",
      yourName:"Your name",shareConsent:"Share my name and chosen photo with my friend after a real secure call connection. I can turn this off later.",
      saveProfile:"✓ Save profile",profileLocal:"Your profile is currently local to this phone.",
      noProfile:"Friend has not shared a profile yet",verifiedConnection:"Both phones are connected via WebRTC",
      selfDeclared:"Photo/name were provided by the peer; not proof of their real-world identity.",
      saved:"✓ Profile saved only on this phone.",sharing:"✓ Approved profile shared over the secure connection.",
      notSharing:"Profile saved locally; not shared with your peer.",
      invalid:"Enter a name of 1–40 characters.",
      photoRejected:"The picture is too large, unsupported, or invalid. Choose JPEG, PNG or WebP.",
      storeError:"Browser storage prevented saving your local profile.",profileReceived:"Friend's self-declared profile",
      idPrefix:"Verified temporary digital ID"},
    ar:{"cameraPhoto":"📷 التقاط صورة بالكاميرا","galleryPhoto":"🖼️ اختر من المعرض","photoHint":"لا تفتح الكاميرا إلا بعد اختيارك؛ ولا تُرفع الصورة تلقائيًا.","photoReady":"✓ الصورة جاهزة. احفظ الملف الشخصي.","yourPhoto":"الصورة الشخصية (اختياري)",editProfile:"👤 ملفي في E-ZERO — الاسم والصورة",
      profilePrivacy:"يبقى الاسم والصورة على هذا الهاتف ولا تُرسلان إلا بموافقتك بعد اتصال مكالمة آمن.",
      yourName:"اسمك",shareConsent:"أسمح بمشاركة اسمي وصورتي المختارة مع صديقي بعد اتصال آمن حقيقي؛ ويمكنني إلغاء الموافقة لاحقًا.",
      saveProfile:"✓ حفظ الملف",profileLocal:"الملف محفوظ محليًا على هذا الهاتف فقط.",
      noProfile:"لم يشارك الصديق ملفه بعد",verifiedConnection:"الهاتفان متصلان عبر WebRTC",
      selfDeclared:"الاسم والصورة قدّمهما الطرف الآخر؛ لا يثبتان هويته الواقعية.",
      saved:"✓ حُفظ الملف على هذا الهاتف فقط.",sharing:"✓ تمت مشاركة الملف الموافق عليه عبر اتصال آمن.",
      notSharing:"الملف محفوظ محليًا ولم يُشارك مع الصديق.",
      invalid:"أدخل اسمًا من حرف واحد إلى 40 حرفًا.",
      photoRejected:"الصورة كبيرة جدًا أو غير مدعومة أو غير صالحة. اختر JPEG أو PNG أو WebP.",
      storeError:"منع المتصفح حفظ الملف المحلي.",profileReceived:"ملف الصديق الذي اختاره",
      idPrefix:"معرّف رقمي مؤقت تم التحقق منه"}
  };
  const t=k=>(copy[document.documentElement.lang]||copy.ur)[k]||k;
  const cleanName=v=>typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,40):"";
  const validAvatar=v=>typeof v==="string"&&v.length<=12000&&(v===""||PHOTO.test(v));
  let profile={name:"",avatar:"",share:false};
  let draftAvatar="",connected=false,lastRemote=null,lastFingerprint="",pendingRemote=null,sentThisSession=false;
  function read(){
    try{
      const p=JSON.parse(localStorage.getItem(KEY)||"null");
      if(p && typeof p==="object" && validAvatar(p.avatar) &&
         typeof p.name==="string"&&p.name.length<=40){
        return {name:cleanName(p.name),avatar:p.avatar,share:p.share===true};
      }
    }catch(_){}
    return {name:"",avatar:"",share:false};
  }
  function labelStatus(key){$("ezeroProfileStatus").textContent=t(key);}
  function showAvatar(imgId,initialId,name,data){
    const img=$(imgId),initial=$(initialId);
    if(data && validAvatar(data)){
      img.src=data;img.hidden=false;initial.hidden=true;
    }else{
      img.removeAttribute("src");img.hidden=true;initial.hidden=false;
      initial.textContent=Array.from(name.trim())[0]?.toUpperCase()||"E";
    }
  }
  function updateLocal(){
    $("ezeroMyName").value=profile.name;
    $("ezeroShareProfile").checked=profile.share;
    draftAvatar=profile.avatar;
    showAvatar("ezeroMyAvatar","ezeroMyInitial",profile.name,profile.avatar);
  }
  function resetRemote(){
    connected=false;lastRemote=null;lastFingerprint="";pendingRemote=null;sentThisSession=false;
    $("ezeroPeerProfileCard").hidden=true;
    $("ezeroPeerDisplayName").textContent=t("noProfile");
    $("ezeroPeerSessionId").textContent="";
    showAvatar("ezeroPeerAvatar","ezeroPeerInitial","?", "");
  }
  function showPeerConnection(){
    const transport=window.EZERO_PEER_PROFILE_TRANSPORT;
    if(!transport?.connected())return;
    const fp=transport.peerFingerprint();
    if(!/^[a-f0-9]{64}$/.test(fp))return;
    connected=true;lastFingerprint=fp;
    $("ezeroPeerProfileCard").hidden=false;
    $("ezeroPeerSessionId").textContent=t("idPrefix")+": "+
      fp.slice(0,12)+"…"+fp.slice(-8);
    $("ezeroVerifiedConnection").textContent=t("verifiedConnection");
    if(pendingRemote?.fingerprint===fp){
      lastRemote={name:pendingRemote.name,avatar:pendingRemote.avatar};
    }
    $("ezeroPeerDisplayName").textContent=lastRemote?.name||t("noProfile");
    showAvatar("ezeroPeerAvatar","ezeroPeerInitial",lastRemote?.name||"?",lastRemote?.avatar||"");
    $("ezeroPeerTrustNote").textContent=t("selfDeclared");
  }
  function sendProfile(force=false){
    const transport=window.EZERO_PEER_PROFILE_TRANSPORT;
    if((sentThisSession&&!force)||!profile.share||!profile.name||!transport?.connected())return false;
    const good=transport.send(profile.name,profile.avatar);
    if(good){sentThisSession=true;labelStatus("sharing");}
    return good;
  }
  profile=read();updateLocal();
  $("ezeroMyName").addEventListener("input",()=>{
    if(!draftAvatar)showAvatar("ezeroMyAvatar","ezeroMyInitial",$("ezeroMyName").value,"");
  });
  // A capture input and a gallery input are intentionally separate.
  // Browser/OS chooses whether camera access is available; neither starts on load.
  $("ezeroCameraButton").addEventListener("click",()=> $("ezeroCameraPhoto").click());
  $("ezeroGalleryButton").addEventListener("click",()=> $("ezeroMyPhoto").click());
  let photoBusy=false;
  async function onPhotoChosen(inputId){
    const input=$(inputId),file=input.files?.[0];
    if(!file||photoBusy)return;
    if(!["image/jpeg","image/png","image/webp","image/heic","image/heif"].includes(file.type)||file.size>12*1024*1024){
      labelStatus("photoRejected");input.value="";return;
    }
    photoBusy=true;
    $("ezeroCameraButton").disabled=true;
    $("ezeroGalleryButton").disabled=true;
    try{
      // Read only a user-picked file locally; never send it to a photo server.
      // CSP permits data: pictures but forbids blob: image sources.
      const localData=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(Error("READ_FAILED"));
        reader.readAsDataURL(file);
      });
      if(typeof localData!=="string"||!/^data:image\/(jpeg|png|webp|heic|heif);base64,[A-Za-z0-9+/=]+$/.test(localData))throw Error("BAD_IMAGE");
      const photo=new Image();
      await new Promise((resolve,reject)=>{
        photo.onload=resolve;photo.onerror=reject;photo.src=localData;
      });
      if(!photo.naturalWidth||!photo.naturalHeight)throw Error("BAD_IMAGE");
      const canvas=document.createElement("canvas");
      canvas.width=72;canvas.height=72;
      const ctx=canvas.getContext("2d");
      if(!ctx)throw Error("NO_CANVAS");
      const edge=Math.min(photo.naturalWidth,photo.naturalHeight);
      ctx.drawImage(photo,(photo.naturalWidth-edge)/2,(photo.naturalHeight-edge)/2,
        edge,edge,0,0,72,72);
      const encoded=canvas.toDataURL("image/jpeg",.6);
      if(!PHOTO.test(encoded)||encoded.length>12000)throw Error("IMAGE_TOO_LARGE");
      draftAvatar=encoded;
      showAvatar("ezeroMyAvatar","ezeroMyInitial",$("ezeroMyName").value,draftAvatar);
      labelStatus("photoReady");
    }catch(_){labelStatus("photoRejected");}
    finally{
      input.value="";
      photoBusy=false;
      $("ezeroCameraButton").disabled=false;
      $("ezeroGalleryButton").disabled=false;
    }
  }
  $("ezeroCameraPhoto").addEventListener("change",()=>onPhotoChosen("ezeroCameraPhoto"));
  $("ezeroMyPhoto").addEventListener("change",()=>onPhotoChosen("ezeroMyPhoto"));
  $("ezeroSaveProfile").addEventListener("click",()=>{
    const name=cleanName($("ezeroMyName").value);
    if(name.length<1||name.length>40){labelStatus("invalid");return;}
    const next={name,avatar:validAvatar(draftAvatar)?draftAvatar:"",share:$("ezeroShareProfile").checked};
    try{localStorage.setItem(KEY,JSON.stringify(next));}
    catch(_){labelStatus("storeError");return;}
    profile=next;updateLocal();
    labelStatus(profile.share?"saved":"notSharing");
    sendProfile(true);
  });
  function localize(){
    for(const el of document.querySelectorAll("[data-profile-i18n]")){
      el.textContent=t(el.dataset.profileI18n);
    }
    if(connected){
      $("ezeroVerifiedConnection").textContent=t("verifiedConnection");
      $("ezeroPeerTrustNote").textContent=t("selfDeclared");
      $("ezeroPeerSessionId").textContent=t("idPrefix")+": "+
        lastFingerprint.slice(0,12)+"…"+lastFingerprint.slice(-8);
      $("ezeroPeerDisplayName").textContent=lastRemote?.name||t("noProfile");
    }
  }
  $("language").addEventListener("change",localize);
  document.addEventListener("ezero:channel-state",e=>{
    if(e.detail?.connected){showPeerConnection();sendProfile();}
    else resetRemote();
  });
  document.addEventListener("ezero:call-status",e=>{
    if(e.detail?.stage==="connected"){showPeerConnection();sendProfile();}
    else if(["offline","iceNoRoute","idle"].includes(e.detail?.stage))resetRemote();
  });
  document.addEventListener("ezero:profile-received",e=>{
    const p=e.detail||{};
    // The remote fingerprint is derived by the verified call engine,
    // not supplied in the profile payload. A DataChannel may open just
    // before RTCPeerConnection fires its final connected event: retain
    // the validated profile briefly, but do not DISPLAY it until connected.
    if(p.connected!==true || !/^[a-f0-9]{64}$/.test(p.peerFingerprint||"") ||
       !cleanName(p.name)||!validAvatar(p.avatar))return;
    pendingRemote={name:cleanName(p.name),avatar:p.avatar,
      fingerprint:p.peerFingerprint};
    showPeerConnection();
  });
  window.addEventListener("pagehide",resetRemote);
  localize();
})();
