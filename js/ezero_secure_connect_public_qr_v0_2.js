/* E-ZERO public Secure Connect: standalone, read-only, QR-only identity demo.
 * Browser-local ECDSA P-256 + SHA-256; no WebRTC, call signaling,
 * analytics, advertising, upload, microphone, automatic pairing or call.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const ui={
    ur:{
      back:"↩ واپس",language:"زبان",heading:"محفوظ QR رابطہ",intro:"ایک بٹن دبائیں، اپنا QR دکھائیں اور دوست کا QR اسکین کریں۔",
      startLabel:"رابطہ شروع کریں",start:"📷 QR رابطہ شروع کریں",again:"📷 دوبارہ اسکین کریں",showQr:"اپنا QR دوست کو دکھائیں",
      stop:"■ کیمرہ بند کریں",flip:"🔄 کیمرہ بدلیں",torchOn:"🔦 لائٹ آن",torchOff:"🔦 لائٹ بند",gallery:"🖼️ گیلری سے QR",galleryNoQr:"تصویر میں QR نہیں ملا؛ دوسری واضح تصویر آزمائیں۔",truth:"QR صرف عارضی ڈیجیٹل چابی کی تصدیق کرتا ہے، انسان کی شناخت یا مکمل کال کی نہیں۔ کال خودکار شروع نہیں ہوگی۔",
      share:"↗ دوست کو ایپ کا لنک بھیجیں",footer:"E-ZERO · کوئی اشتہار نہیں، کوئی خفیہ ریکارڈنگ نہیں۔",
      policy:"🔒 پرائیویسی اور کاروباری تحفظ کی پالیسی",generating:"اس فون پر عارضی محفوظ شناخت تیار ہو رہی ہے…",
      scanning:"کیمرہ فعال ہے۔ دوسرے فون کا E-ZERO QR سامنے دکھائیں۔",
      verified:"✓ دوست کے QR کے دستخط درست ہیں۔ صرف عارضی ڈیجیٹل شناخت کی تصدیق ہوئی ہے؛ کال شروع نہیں ہوئی۔",
      self:"یہ آپ کا اپنا QR ہے، دوست کا نہیں۔",expired:"اس QR کی مدت ختم ہوگئی؛ دوسرے فون پر نیا QR بنائیں۔",
      invalid:"QR درست نہیں یا E-ZERO کا نہیں۔ محفوظ شناخت مسترد کردی گئی۔",unsupported:"QR ظاہر ہوگیا۔ اس براؤزر میں کیمرے سے QR پڑھنے کی سہولت نہیں؛ معاونت یافتہ براؤزر استعمال کریں۔",
      denied:"کیمرے کی اجازت نہیں ملی؛ براؤزر میں Camera کی اجازت دیں اور دوبارہ دبائیں۔",
      unavailable:"کیمرہ دستیاب نہیں یا مصروف ہے؛ دوسرا براؤزر/کیمرہ آزمائیں۔",
      failure:"QR پڑھنے میں مسئلہ آیا؛ کیمرہ بند ہوگیا۔ دوبارہ آزمائیں۔",
      timeout:"20 سیکنڈ تک QR نہیں ملا؛ کیمرہ بند ہوگیا۔ دوبارہ آزمائیں۔",
      stopped:"کیمرہ بند کردیا گیا۔",shareCopied:"صرف ایپ کا عوامی لنک کاپی ہوا؛ کوئی ذاتی QR نہیں بھیجا گیا۔",
      shareFail:"شیئر دستیاب نہیں؛ براؤزر کا Share مینو استعمال کریں۔",https:"QR کے لیے محفوظ HTTPS/Web Crypto ضروری ہے۔",
      retry:"دوبارہ کوشش کریں۔",communicationsTitle:"📱 E-ZERO آڈیو، ویڈیو اور پیغامات",communicationsTruth:"اصل تجرباتی کال اور چیٹ کے بٹن واپس آگئے ہیں۔ دو فونوں کا کنکشن ابھی دعوت اور جواب سے بنایا جاتا ہے؛ خودکار کال دستیاب نہیں۔",audioEntry:"آڈیو کال",videoEntry:"ویڈیو کال",voiceEntry:"وائس میسج",chatEntry:"نجی چیٹ",nearbyTitle:"📶 مستقبل: E-ZERO Nearby / Offline",nearbyDesc:"قریب موجود فون کے Wi-Fi/ہاٹ اسپاٹ سگنل کی رینج میں مقامی E-ZERO رابطہ ممکن بنانے کا منصوبہ ہے؛ یہ ابھی فعال نہیں۔",nearbyOpt:"مستقبل میں اختیاری Nearby فیچر کی معلومات دکھائیں۔ یہ موبائل ڈیٹا استعمال کرنے یا ہاٹ اسپاٹ کھولنے کی اجازت نہیں ہے۔",nearbyNo:"اس وقت کوئی خودکار Wi-Fi یا موبائل ڈیٹا شیئرنگ فعال نہیں ہے۔",nearbySaved:"آئندہ Nearby ترجیح اسی براؤزر میں رکھی گئی۔ یہ اصل انٹرنیٹ شیئرنگ کی اجازت نہیں۔"
    },
    en:{
      back:"↩ Back",language:"Language",heading:"Secure QR connect",intro:"One tap shows your QR and scans your friend's QR.",
      startLabel:"Start a connection",start:"📷 Start QR connection",again:"📷 Scan again",showQr:"Show your QR to your friend",
      stop:"■ Stop camera",flip:"🔄 Switch camera",torchOn:"🔦 Torch on",torchOff:"🔦 Torch off",gallery:"🖼️ Scan from gallery",galleryNoQr:"No QR code found in that image. Try a clearer image.",truth:"QR verifies only a temporary digital key, not a person's identity or an actual call. No call starts automatically.",
      share:"↗ Share this app with a friend",footer:"E-ZERO · No ads, no hidden recording.",
      policy:"🔒 Privacy and business protection policy",generating:"Creating a temporary identity on this device…",
      scanning:"Camera active. Point at your friend's E-ZERO QR.",
      verified:"✓ The signed QR is valid. Only the temporary digital identity was checked; no call was started.",
      self:"That is your own QR, not your friend's.",expired:"This QR expired. Generate a new one on the other phone.",
      invalid:"Invalid or non-E-ZERO QR. Identity rejected.",unsupported:"QR is ready, but this browser cannot scan QR using its camera. Use a supported browser.",
      denied:"Camera permission denied. Allow Camera in browser settings and retry.",
      unavailable:"Camera unavailable or busy. Try another camera/browser.",
      failure:"QR scan failed and the camera was stopped. Retry.",
      timeout:"No QR found within 20 seconds. Camera stopped; retry.",
      stopped:"Camera stopped.",shareCopied:"Only the public app link was copied; no private QR was shared.",
      shareFail:"Sharing unavailable; use your browser's Share menu.",https:"Secure HTTPS/Web Crypto is required.",retry:"Please retry.",communicationsTitle:"📱 E-ZERO Calls, Voice & Chat",communicationsTruth:"Experimental audio/video and chat controls are restored. Two-phone calls still need an offer and answer; no automatic call connection yet.",audioEntry:"Audio call",videoEntry:"Video call",voiceEntry:"Voice message",chatEntry:"Private chat",nearbyTitle:"📶 Future: E-ZERO Nearby / Offline",nearbyDesc:"Local E-ZERO connectivity within Wi-Fi/hotspot radio range is planned, but not enabled.",nearbyOpt:"Show me updates about an optional future Nearby feature. This does not authorize hotspot or mobile-data access.",nearbyNo:"No automatic Wi-Fi or mobile data sharing is active.",nearbySaved:"Nearby preference saved in this browser; not permission to share mobile data."
    },
    ar:{
      back:"↩ رجوع",language:"اللغة",heading:"اتصال QR آمن",intro:"ضغطة واحدة لعرض رمزك ومسح رمز صديقك.",
      startLabel:"ابدأ الاتصال",start:"📷 بدء اتصال QR",again:"📷 المسح مجدداً",showQr:"اعرض رمز QR لصديقك",
      stop:"■ إيقاف الكاميرا",flip:"🔄 تبديل الكاميرا",torchOn:"🔦 تشغيل الضوء",torchOff:"🔦 إيقاف الضوء",gallery:"🖼️ مسح من المعرض",galleryNoQr:"لم يتم العثور على رمز QR في الصورة. جرّب صورة أوضح.",truth:"يتحقق QR من مفتاح رقمي مؤقت فقط، وليس هوية الشخص أو مكالمة فعلية. لن تبدأ المكالمة تلقائياً.",
      share:"↗ مشاركة التطبيق مع صديق",footer:"E-ZERO · بلا إعلانات أو تسجيل خفي.",
      policy:"🔒 سياسة الخصوصية وحماية الأعمال",generating:"جارٍ إنشاء هوية مؤقتة على هذا الجهاز…",
      scanning:"الكاميرا تعمل. وجّهها نحو رمز E-ZERO الخاص بصديقك.",
      verified:"✓ توقيع رمز QR صالح. تم التحقق من المفتاح الرقمي المؤقت فقط، ولم تبدأ مكالمة.",
      self:"هذا رمزك أنت وليس رمز صديقك.",expired:"انتهت صلاحية QR. أنشئ رمزاً جديداً على الهاتف الآخر.",
      invalid:"QR غير صالح أو ليس من E-ZERO. رُفضت الهوية.",unsupported:"الرمز جاهز لكن هذا المتصفح لا يدعم المسح بالكاميرا. استخدم متصفحاً مدعوماً.",
      denied:"رُفض إذن الكاميرا. اسمح به من إعدادات المتصفح ثم أعد المحاولة.",
      unavailable:"الكاميرا غير متاحة أو مشغولة. جرّب كاميرا أو متصفحاً آخر.",
      failure:"فشل المسح وتم إيقاف الكاميرا. أعد المحاولة.",
      timeout:"لم يُعثر على QR خلال 20 ثانية. توقفت الكاميرا.",
      stopped:"أُوقفت الكاميرا.",shareCopied:"نُسخ رابط التطبيق العام فقط دون مشاركة QR شخصي.",
      shareFail:"المشاركة غير متاحة. استخدم قائمة المشاركة في المتصفح.",https:"يلزم HTTPS/Web Crypto آمن.",retry:"أعد المحاولة.",communicationsTitle:"📱 مكالمات ورسائل E-ZERO",communicationsTruth:"أُعيدت أدوات المكالمات والمحادثة التجريبية. لا يزال الاتصال بين هاتفين يتطلب دعوة وردًا، دون مكالمة تلقائية.",audioEntry:"مكالمة صوتية",videoEntry:"مكالمة مرئية",voiceEntry:"رسالة صوتية",chatEntry:"محادثة خاصة",nearbyTitle:"📶 مستقبلًا: E-ZERO Nearby دون إنترنت",nearbyDesc:"نخطط لاتصال محلي بين هواتف E-ZERO ضمن نطاق إشارة Wi-Fi أو نقطة الاتصال، لكنه غير مفعّل.",nearbyOpt:"أرغب في رؤية معلومات عن ميزة Nearby الاختيارية المستقبلية. هذا لا يسمح باستخدام نقطة الاتصال أو بيانات الهاتف.",nearbyNo:"لا توجد مشاركة تلقائية لشبكة Wi-Fi أو بيانات الهاتف الآن.",nearbySaved:"حُفظ تفضيل Nearby في هذا المتصفح، وليس تصريحًا لمشاركة بيانات الهاتف."
    }
  };
  const textEncoder=new TextEncoder();
  const $status=$("oneTapResult"),$start=$("oneTapStartButton"),$video=$("scanVideo"),
    $stage=$("oneTapStage"),$stop=$("oneTapStop"),$qr=$("oneTapQr"),
    $camera=$("oneTapCamera"),$controls=$("oneTapCameraControls"),
    $cameraStatus=$("oneTapCameraStatus"),$flip=$("oneTapFlipCamera"),
    $torch=$("oneTapTorch"),$galleryButton=$("oneTapGalleryButton"),
    $galleryInput=$("oneTapGalleryInput");
  if(!$status||!$start||!$video||!$stage||!$stop||!$qr||!$camera||
     !$controls||!$cameraStatus||!$flip||!$torch||!$galleryButton||!$galleryInput)return;
  let language="ur",generation=0,stream=null,timer=null,deadlineTimer=null,
    identity=null,started=false,cameraFacing="environment",torchOn=false,lastState=null;
  const scanCanvas=document.createElement("canvas");
  const scanContext=scanCanvas.getContext("2d",{willReadFrequently:true});
  const say=k=>ui[language][k]||k;
  function showState(key,kind="info"){
    lastState={key,kind};$status.textContent=say(key);$status.dataset.kind=kind;
    $cameraStatus.textContent=say(key);
  }
  function selectLanguage(value){
    language=Object.hasOwn(ui,value)?value:"ur";
    document.documentElement.lang=language;
    document.documentElement.dir=language==="en"?"ltr":"rtl";
    $("language").value=language;
    for(const el of document.querySelectorAll("[data-ui]"))el.textContent=say(el.dataset.ui);
    $start.textContent=say(started?"again":"start");
    // Keep the user's choice when opening the complete privacy policy.
    // The Urdu default keeps its simple, unchanged public URL.
    const policyLink=document.querySelector(".privacy-link a");
    if(policyLink){
      const base="./ezero_secure_connect_privacy_v0_2.html";
      policyLink.href=language==="ur"?base:base+"?lang="+encodeURIComponent(language);
    }
    // The communications laboratory and policy follow the selected language.
    for(const link of document.querySelectorAll("[data-comm-mode]")){
      const mode=link.dataset.commMode;
      link.href="./ezero_secure_connect_communications_v0_3.html?mode="+
        encodeURIComponent(mode)+(language==="ur"?"":"&lang="+encodeURIComponent(language));
    }
    if(lastState)showState(lastState.key,lastState.kind);
  }
  $("language").addEventListener("change",e=>selectLanguage(e.target.value));
  selectLanguage(new URLSearchParams(location.search).get("lang")||"ur");
  const bytes=n=>{const b=new Uint8Array(n);crypto.getRandomValues(b);return b;};
  const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
  const toBase64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  function fromBase64(input){
    if(!/^[A-Za-z0-9_-]+$/.test(input)||input.length>2000)throw Error("INVALID");
    return Uint8Array.from(atob(input.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-input.length%4)%4)),c=>c.charCodeAt(0));
  }
  const digest=async b=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",b)));
  function payload(pub,fp,nonce,expiry){
    return ["EZERO-IDENTITY-1",location.origin,pub,fp,nonce,expiry].join("|");
  }
  async function newIdentity(){
    if(!window.isSecureContext||!crypto?.subtle)throw Error("HTTPS");
    const keys=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
    const pub=toBase64(await crypto.subtle.exportKey("spki",keys.publicKey));
    const fp=await digest(fromBase64(pub));
    const nonce=hex(bytes(12)),expiry=Date.now()+600000;
    const signature=toBase64(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},keys.privateKey,
      textEncoder.encode(payload(pub,fp,nonce,expiry))));
    return {fp,token:["EZERO1",pub,fp,nonce,String(expiry),signature].join("."),keys};
  }
  function drawQr(token){
    $qr.replaceChildren();
    if(typeof window.qrcode!=="function")throw Error("QR_LIB");
    const qr=window.qrcode(0,"L");qr.addData(token);qr.make();
    $qr.innerHTML=qr.createSvgTag(3,4);
    const svg=$qr.querySelector("svg");
    if(svg){svg.setAttribute("role","img");svg.setAttribute("aria-label","E-ZERO signed temporary identity QR");}
  }
  async function verify(token){
    if(typeof token!=="string"||token.length>1300)throw Error("INVALID");
    const p=token.trim().split(".");
    if(p.length!==6||p[0]!=="EZERO1"||!/^[a-f0-9]{64}$/.test(p[2])||
       !/^[a-f0-9]{24}$/.test(p[3])||!/^\d{13}$/.test(p[4]))throw Error("INVALID");
    const expiry=Number(p[4]);
    if(expiry<Date.now()||expiry>Date.now()+610000)throw Error("EXPIRED");
    const pubBytes=fromBase64(p[1]);
    if(pubBytes.length>140||await digest(pubBytes)!==p[2])throw Error("INVALID");
    const pubKey=await crypto.subtle.importKey("spki",pubBytes,
      {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    const good=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},pubKey,fromBase64(p[5]),
      textEncoder.encode(payload(p[1],p[2],p[3],expiry)));
    if(!good)throw Error("INVALID");
    if(p[2]===identity?.fp)throw Error("SELF");
    return {fingerprint:p[2],publicKey:pubKey};
  }
  function stopCamera(show=false){
    ++generation;
    if(timer!==null){clearTimeout(timer);timer=null;}
    if(deadlineTimer!==null){clearTimeout(deadlineTimer);deadlineTimer=null;}
    if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
    $video.pause();$video.srcObject=null;$video.hidden=true;
    $camera.classList.remove("scanner-active");$controls.hidden=true;
    $stop.hidden=false;$start.disabled=false;torchOn=false;
    $torch.setAttribute("aria-pressed","false");$torch.textContent=say("torchOn");
    $torch.disabled=true;
    if(show)showState("stopped");
  }
  $stop.addEventListener("click",()=>stopCamera(true));
  async function openScanner(){
    if(typeof window.jsQR!=="function"||!navigator.mediaDevices?.getUserMedia){
      showState("unsupported","warning");return;
    }
    const round=generation;
    try{
      const camera=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:{ideal:cameraFacing},width:{ideal:1280},height:{ideal:720}},
        audio:false
      });
      if(round!==generation||document.hidden){camera.getTracks().forEach(t=>t.stop());return;}
      stream=camera;$video.srcObject=camera;$video.hidden=false;
      await $video.play();
      if(round!==generation||document.hidden){stopCamera();return;}
      $camera.classList.add("scanner-active");$controls.hidden=false;
      const track=camera.getVideoTracks()[0];
      let capabilities={};
      try{capabilities=track?.getCapabilities?.()||{};}catch(_){}
      $torch.disabled=!capabilities.torch;
      $torch.setAttribute("aria-pressed","false");$torch.textContent=say("torchOn");
      showState("scanning");
      deadlineTimer=setTimeout(()=>{
        if(round!==generation)return;
        stopCamera();showState("timeout","warning");
      },45000);
      const frame=()=>{
        if(round!==generation||!stream||document.hidden)return;
        try{
          if($video.readyState>=2&&$video.videoWidth>0&&$video.videoHeight>0){
            const scale=Math.min(1,960/Math.max($video.videoWidth,$video.videoHeight));
            const width=Math.max(1,Math.round($video.videoWidth*scale));
            const height=Math.max(1,Math.round($video.videoHeight*scale));
            if(scanCanvas.width!==width)scanCanvas.width=width;
            if(scanCanvas.height!==height)scanCanvas.height=height;
            scanContext.drawImage($video,0,0,width,height);
            const pixels=scanContext.getImageData(0,0,width,height);
            const result=window.jsQR(pixels.data,width,height,{inversionAttempts:"attemptBoth"});
            if(result?.data){
              const token=String(result.data);
              stopCamera();
              verify(token).then(()=>showState("verified","success")).catch(e=>{
                showState(e.message==="SELF"?"self":e.message==="EXPIRED"?"expired":"invalid","error");
              });
              return;
            }
          }
        }catch(_){}
        if(round===generation)timer=setTimeout(frame,120);
      };
      timer=setTimeout(frame,180);
    }catch(e){
      if(round!==generation)return;
      stopCamera();
      const name=String(e?.name||"");
      showState(name==="NotAllowedError"||name==="SecurityError"?"denied":
        name==="NotFoundError"||name==="NotReadableError"?"unavailable":"failure","error");
    }
  }
  $flip.addEventListener("click",async()=>{
    if(!stream)return;
    cameraFacing=cameraFacing==="environment"?"user":"environment";
    stopCamera(false);
    await openScanner();
  });
  $torch.addEventListener("click",async()=>{
    const track=stream?.getVideoTracks?.()[0];
    if(!track)return;
    try{
      const capabilities=track.getCapabilities?.()||{};
      if(!capabilities.torch){$torch.disabled=true;return;}
      torchOn=!torchOn;
      await track.applyConstraints({advanced:[{torch:torchOn}]});
      $torch.setAttribute("aria-pressed",String(torchOn));
      $torch.textContent=say(torchOn?"torchOff":"torchOn");
    }catch(_){$torch.disabled=true;torchOn=false;$torch.setAttribute("aria-pressed","false");}
  });
  $galleryButton.addEventListener("click",()=>{
    stopCamera(false);
    $galleryInput.click();
  });
  $galleryInput.addEventListener("change",async()=>{
    const file=$galleryInput.files?.[0];$galleryInput.value="";
    if(!file)return;
    try{
      let bitmap;
      if("createImageBitmap" in window)bitmap=await createImageBitmap(file);
      else{
        const url=URL.createObjectURL(file);
        bitmap=await new Promise((resolve,reject)=>{
          const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;
        });
      }
      const width=bitmap.width,height=bitmap.height;
      if(!width||!height)throw Error("IMAGE");
      const scale=Math.min(1,1600/Math.max(width,height));
      const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
      scanCanvas.width=w;scanCanvas.height=h;scanContext.drawImage(bitmap,0,0,w,h);
      if(typeof bitmap.close==="function")bitmap.close();
      const pixels=scanContext.getImageData(0,0,w,h);
      const result=window.jsQR(pixels.data,w,h,{inversionAttempts:"attemptBoth"});
      if(!result?.data){showState("galleryNoQr","warning");return;}
      await verify(String(result.data));showState("verified","success");
    }catch(e){
      showState(e.message==="SELF"?"self":e.message==="EXPIRED"?"expired":"invalid","error");
    }
  });
  $start.addEventListener("click",async()=>{
    if($start.disabled)return;
    stopCamera();$start.disabled=true;
    started=true;$stage.hidden=false;$start.textContent=say("again");
    showState("generating");
    try{
      identity=await newIdentity();
      drawQr(identity.token);
      if(!document.hidden)await openScanner();
      else showState("stopped");
    }catch(e){showState(e.message==="HTTPS"?"https":"failure","error");}
    finally{$start.disabled=false;}
  });
  document.addEventListener("visibilitychange",()=>{if(document.hidden)stopCamera();});
  window.addEventListener("pagehide",()=>{stopCamera();identity=null;$qr.replaceChildren();});
  // Narrow boundary for a separate user-controlled remote-invite UI.
  // No private CryptoKey is exported. No general-purpose arbitrary signing API.
  async function publicIdentity(){
    if(!identity||Number(identity.token.split(".")[4])<Date.now()){
      identity=await newIdentity();drawQr(identity.token);
    }
    return Object.freeze({token:identity.token,fp:identity.fp});
  }
  async function signedRemoteReply(id,requesterFp){
    if(!/^[a-f0-9]{32}$/.test(id)||!/^[a-f0-9]{64}$/.test(requesterFp))throw Error("INVALID_REQUEST");
    const current=await publicIdentity();
    const data=["E-ZERO-REPLY-1",location.origin,id,requesterFp,current.fp].join("|");
    const sig=toBase64(await crypto.subtle.sign(
      {name:"ECDSA",hash:"SHA-256"},identity.keys.privateKey,textEncoder.encode(data)));
    return Object.freeze({token:current.token,sig});
  }
  window.EZERO_PUBLIC_QR_CORE=Object.freeze({
    identity:publicIdentity,verifySignedQr:verify,signBoundReply:signedRemoteReply
  });

})();
