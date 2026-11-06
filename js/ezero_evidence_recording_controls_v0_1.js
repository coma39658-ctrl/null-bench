/* E-ZERO recording/evidence pilot — isolated staging page ONLY.
 * Record only after both users take explicit actions on an authenticated
 * WebRTC DataChannel. Store media in tab memory for 10 minutes after stop.
 * No uploads, background recording, server persistence or covert capture.
 * Recorded consent remains a local report of P2P UI events, NOT proof of
 * a legally identified person or third-party legal approval.
 */
(()=>{"use strict";
  const proof=window.EZERO_SIGNED_MEDIA_EVIDENCE;
  const rtc=window.EZERO_RECORD_CONSENT_TRANSPORT;
  const root=document.getElementById("ezeroEvidencePanel");
  if(!proof||!rtc||!root)return;
  const $=id=>document.getElementById(id);
  const idPattern=/^[a-f0-9]{32}$/;
  const fpPattern=/^[a-f0-9]{64}$/;
  const MAX_BYTES=64*1024*1024;
  const MAX_RECORD_MS=600000;
  const PREPARED_EXPIRES_MS=45000;
  let requested=null,incoming=null,approved=null,recording=null,remoteActive=null;
  let countdown=null;
  const dictionary={
    ur:{idle:"ریکارڈنگ خودکار طور پر شروع نہیں ہوتی۔ پہلے دونوں افراد کی اجازت ضروری ہے۔",
      offline:"پہلے محفوظ کال جوڑیں؛ پھر اجازت لیں۔",request:"دوسرے فرد سے ریکارڈنگ کی اجازت مانگی گئی۔",
      incoming:"دوسرے فرد نے ریکارڈنگ کی اجازت مانگی ہے۔",granted:"اجازت ملی؛ اب خود ریکارڈنگ شروع کریں۔",
      denied:"ریکارڈنگ کی اجازت نہیں ملی۔",prepared:"آپ نے اجازت دی؛ ریکارڈنگ شروع نہیں ہوئی۔",
      started:"🔴 REC — آپ کے فون پر ریکارڈنگ جاری ہے۔",peerStarted:"🔴 REC — دوسرا فرد ریکارڈنگ کر رہا ہے۔",
      stopped:"ریکارڈنگ ختم؛ مقامی ثبوت زیادہ سے زیادہ 10 منٹ دستیاب ہے۔",
      failed:"ریکارڈنگ یا ثبوت محفوظ کرنے میں مسئلہ؛ کوئی خفیہ ریکارڈنگ نہیں ہوئی۔",
      limit:"ریکارڈنگ کی مقامی حد پوری؛ ریکارڈنگ روکی گئی۔",
      timeout:"اجازت کی مہلت ختم۔ دوبارہ درخواست کریں۔",
      saved:"دستخط شدہ ثبوت ZIP ڈاؤن لوڈ کے لیے فراہم کر دی گئی ہے۔",
      expired:"10 منٹ مکمل — عارضی ثبوت ختم ہو گیا۔",
      none:"ابھی کوئی عارضی میڈیا فائل موجود نہیں۔",
      demand:"درخواست: کال ریکارڈ کرنے کے لیے دونوں کی اجازت",
      accept:"✓ ریکارڈنگ کی اجازت دیں",reject:"✕ اجازت نہ دیں",
      requestButton:"🔒 ریکارڈنگ کی اجازت مانگیں",
      startButton:"🔴 منظوری کے بعد ریکارڈنگ شروع کریں",
      stopButton:"■ ریکارڈنگ بند کریں",save:"⬇ SHA-256 + دستخط شدہ ثبوت ZIP",
      importNote:"اختیاری: اپنے فون سے فائل منتخب کریں؛ اسے اصل E-ZERO کال کا ثبوت نہیں کہا جائے گا۔",
      imported:"منتخب فائل صرف اس فون کی عارضی میموری میں ہے۔",
      downloadFail:"ثبوت نہیں بن سکا یا 10 منٹ ختم ہو گئے۔"},
    en:{idle:"No automatic recording. Both participants must explicitly consent.",
      offline:"Connect a verified call first.",request:"Recording permission requested.",
      incoming:"The other person requests permission to record.",
      granted:"Approved. Tap Start to record on your phone.",
      denied:"Recording permission denied.",prepared:"You approved; no recording started yet.",
      started:"🔴 REC — recording on this device.",peerStarted:"🔴 REC — the other person is recording.",
      stopped:"Recording ended. Local evidence is available up to 10 minutes.",
      failed:"Recording/evidence unavailable; no covert capture.",
      limit:"Local recording size or time limit reached; stopped.",
      timeout:"Permission expired. Request again.",saved:"Signed evidence ZIP download initiated.",
      expired:"10 minutes elapsed; transient evidence expired.",none:"No transient evidence available.",
      demand:"Request: permission to record call",
      accept:"✓ Allow recording",reject:"✕ Deny recording",
      requestButton:"🔒 Request recording consent",startButton:"🔴 Start after approval",
      stopButton:"■ Stop recording",save:"⬇ SHA-256 + signed evidence ZIP",
      importNote:"Optional imported files are not certified as original E-ZERO call media.",
      imported:"Selected file is temporarily held only in this browser.",
      downloadFail:"Evidence failed or the 10-minute window expired."},
    ar:{idle:"لا يبدأ التسجيل تلقائياً. موافقة الطرفين مطلوبة.",
      offline:"اتصل بمكالمة موثقة أولاً.",request:"أُرسل طلب الموافقة على التسجيل.",
      incoming:"الطرف الآخر يطلب الإذن بالتسجيل.",
      granted:"تمت الموافقة. اضغط بدء التسجيل بنفسك.",
      denied:"لم تتم الموافقة.",prepared:"منحت الإذن ولم يبدأ التسجيل بعد.",
      started:"🔴 REC — التسجيل جارٍ على جهازك.",peerStarted:"🔴 REC — الطرف الآخر يسجل.",
      stopped:"انتهى التسجيل. الدليل المحلي متاح لمدة تصل إلى 10 دقائق.",
      failed:"فشل التسجيل أو الدليل؛ لا تسجيل خفي.",
      limit:"تم بلوغ حد التسجيل المحلي؛ أوقف.",
      timeout:"انتهت مهلة الموافقة.",saved:"بدأ تنزيل ملف الإثبات الموقّع.",
      expired:"انتهت 10 دقائق وحُذف الدليل المؤقت.",none:"لا توجد ملفات مؤقتة.",
      demand:"طلب الموافقة على تسجيل المكالمة",accept:"✓ أوافق على التسجيل",
      reject:"✕ أرفض التسجيل",requestButton:"🔒 طلب إذن التسجيل",
      startButton:"🔴 ابدأ التسجيل بعد الموافقة",stopButton:"■ أوقف التسجيل",
      save:"⬇ ملف الدليل مع SHA-256 والتوقيع",
      importNote:"ملفك المستورد لا يُعتمد تلقائياً كتسجيل مكالمة E-ZERO أصلي.",
      imported:"الملف مؤقت في متصفحك فقط.",
      downloadFail:"فشل إنشاء الدليل أو انتهت المهلة."}
  };
  const t=k=>(dictionary[document.documentElement.lang]||dictionary.ur)[k]||k;
  const msg=(k)=>{$("ezeroEvidenceStatus").textContent=t(k);};
  const fingerprint=()=>rtc.peerFingerprint?.()||"";
  const alive=()=>rtc.connected?.()===true&&fpPattern.test(fingerprint());
  const randomId=()=>{
    const data=crypto.getRandomValues(new Uint8Array(16));
    return Array.from(data,n=>n.toString(16).padStart(2,"0")).join("");
  };
  const sessionCurrent=id=>idPattern.test(id)&&alive();
  function hideConsent(){
    $("ezeroEvidenceIncoming").hidden=!incoming;
    $("ezeroEvidenceStart").hidden=!approved;
    $("ezeroEvidenceStop").hidden=!recording;
    $("ezeroEvidenceAsk").disabled=!!(incoming||requested||approved||recording);
    $("ezeroEvidenceRecBadge").hidden=!(recording||remoteActive);
  }
  function clearPermits(){requested=null;incoming=null;approved=null;remoteActive=null;hideConsent();}
  function stopCapture(reason="stopped",notifyPeer=true){
    if(!recording)return;
    const job=recording;
    recording=null;
    clearTimeout(job.deadline);clearInterval(job.drawTimer);
    if(notifyPeer&&alive())rtc.send("stop",job.id);
    try{if(job.recorder.state==="recording")job.recorder.stop();}catch(_){}
    hideConsent();
    msg(reason);
  }
  function discardStream(job){
    clearInterval(job.drawTimer);clearTimeout(job.deadline);
    try{for(const tr of job.ownedTracks||[])tr.stop();}catch(_){}
    try{job.audioContext?.close();}catch(_){}
  }
  function buildMixer(withVideo){
    const local=$("localVideo")?.srcObject;
    const remote=$("remoteVideo")?.srcObject;
    if(!local||!remote)throw Error("LOCAL_OR_REMOTE_MEDIA_MISSING");
    const audios=[...local.getAudioTracks(),...remote.getAudioTracks()]
      .filter(track=>track.readyState==="live"&&track.enabled);
    if(!audios.length)throw Error("NO_LIVE_AUDIO_TRACK");
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw Error("AUDIO_MIXER_UNSUPPORTED");
    const audioContext=new Audio();
    const destination=audioContext.createMediaStreamDestination();
    const ownedTracks=[];
    for(const track of audios){
      const copy=track.clone();ownedTracks.push(copy);
      const source=audioContext.createMediaStreamSource(new MediaStream([copy]));
      source.connect(destination);
    }
    const combined=new MediaStream(destination.stream.getAudioTracks());
    let drawTimer=null;
    if(withVideo){
      const remoteVideo=$("remoteVideo"),localVideo=$("localVideo");
      if(!remote?.getVideoTracks().length||!remoteVideo||
         typeof document.createElement("canvas").captureStream!=="function")
        throw Error("VIDEO_CAPTURE_NOT_SUPPORTED");
      const canvas=document.createElement("canvas");
      canvas.width=640;canvas.height=360;
      const ctx=canvas.getContext("2d");
      if(!ctx)throw Error("CANVAS_UNAVAILABLE");
      const paint=()=>{
        ctx.fillStyle="#000";ctx.fillRect(0,0,640,360);
        try{
          if(remoteVideo.readyState>=2)ctx.drawImage(remoteVideo,0,0,640,360);
          if(localVideo?.readyState>=2)ctx.drawImage(localVideo,450,240,180,101);
        }catch(_){}
      };
      paint();drawTimer=setInterval(paint,100);
      const videoTrack=canvas.captureStream(10).getVideoTracks()[0];
      if(!videoTrack)throw Error("VIDEO_CAPTURE_NOT_SUPPORTED");
      ownedTracks.push(videoTrack);combined.addTrack(videoTrack);
    }
    return {combined,audioContext,ownedTracks,drawTimer};
  }
  async function startCapture(){
    if(!approved||Date.now()>approved.expires||!alive()||
       approved.peerFingerprint!==fingerprint()||recording)
      return msg("timeout");
    const {id,kind,approvedAt,requestedAt,peerFingerprint}=approved;
    approved=null;hideConsent();
    let job=null;
    try{
      const withVideo=kind==="video";
      const media=buildMixer(withVideo);
      job={...media,id,kind,approvedAt,requestedAt,peerFingerprint,
        startedAt:new Date().toISOString(),chunks:[],bytes:0,
        drawTimer:media.drawTimer,deadline:null,recorder:null};
      await job.audioContext.resume();
      if(!alive()||!rtc.send("start",id))throw Error("PEER_INFORM_FAILED");
      const accepted=(withVideo?
        ["video/webm;codecs=vp8,opus","video/mp4","video/webm"]:
        ["audio/webm;codecs=opus","audio/mp4","audio/ogg","audio/webm"])
        .find(type=>MediaRecorder.isTypeSupported(type));
      if(!accepted)throw Error("MEDIA_RECORDER_UNSUPPORTED");
      job.recorder=new MediaRecorder(job.combined,{mimeType:accepted,
        audioBitsPerSecond:48000,videoBitsPerSecond:withVideo?480000:undefined});
      job.recorder.ondataavailable=e=>{
        if(!e.data?.size)return;
        job.bytes+=e.data.size;
        if(job.bytes>MAX_BYTES){job.chunks=[];stopCapture("limit");}
        else job.chunks.push(e.data);
      };
      job.recorder.onerror=()=>{job.chunks=[];stopCapture("failed");};
      job.recorder.onstop=()=>{
        discardStream(job);
        if(!job.chunks.length)return;
        try{
          const blob=new Blob(job.chunks,{type:job.recorder.mimeType});
          proof.offer({blob,kind:withVideo?"call_video":"call_audio",
            source:"LOCAL_CONSENTED_WEBRTC_CAPTURE",
            consent:"LOCAL_AND_PEER_UI_APPROVAL_REPORTED",
            consentDetails:{callId:id,peerFingerprint,requestedAtDevice:requestedAt,
              peerApprovedAtDevice:approvedAt,startedAtDevice:job.startedAt,
              stoppedAtDevice:new Date().toISOString(),
              peerConsentVerification:"P2P_DATA_CHANNEL_EVENT_NOT_EXTERNALLY_ATTESTED"}
          });
          msg("stopped");
        }catch(_){msg("failed");}
      };
      job.recorder.start(1000);
      recording=job;
      job.deadline=setTimeout(()=>stopCapture("limit"),MAX_RECORD_MS);
      hideConsent();msg("started");
    }catch(_){
      if(job)discardStream(job);
      msg("failed");
      if(alive())rtc.send("stop",id);
    }
  }
  $("ezeroEvidenceAsk").addEventListener("click",()=>{
    if(!alive())return msg("offline");
    if(requested||incoming||approved||recording)return;
    const id=randomId(), peerFingerprint=fingerprint();
    const local=$("localVideo")?.srcObject;
    const kind=local?.getVideoTracks().some(x=>x.readyState==="live")?
      "video":"audio";
    if(!rtc.send("request",id))return msg("failed");
    requested={id,kind,peerFingerprint,at:new Date().toISOString(),
      deadline:Date.now()+PREPARED_EXPIRES_MS};
    hideConsent();msg("request");
    setTimeout(()=>{
      if(requested?.id===id){requested=null;hideConsent();msg("timeout");}
      if(approved?.id===id){approved=null;hideConsent();msg("timeout");}
    },PREPARED_EXPIRES_MS);
  });
  $("ezeroEvidenceApprove").addEventListener("click",()=>{
    if(!incoming||!alive()||incoming.peerFingerprint!==fingerprint())return;
    const id=incoming.id;
    if(!rtc.send("allow",id))return msg("failed");
    incoming=null;hideConsent();msg("prepared");
  });
  $("ezeroEvidenceDeny").addEventListener("click",()=>{
    if(incoming&&alive())rtc.send("deny",incoming.id);
    incoming=null;hideConsent();msg("denied");
  });
  $("ezeroEvidenceStart").addEventListener("click",startCapture);
  $("ezeroEvidenceStop").addEventListener("click",()=>stopCapture("stopped"));
  $("ezeroEvidenceImport").addEventListener("change",e=>{
    const file=e.target.files?.[0];e.target.value="";
    if(!file)return;
    if(file.size>MAX_BYTES||file.size<=0||
       !/^(audio|video)\//.test(file.type))return msg("failed");
    try{
      proof.offer({blob:file,kind:"media_file",source:"USER_IMPORTED_UNVERIFIED",
        consent:"USER_SELECTED_OWN_FILE_NOT_PEER_ATTESTED"});
      msg("imported");
    }catch(_){msg("failed");}
  });
  document.addEventListener("ezero:record-consent",e=>{
    const d=e.detail;
    if(!d?.verifiedChannel||!idPattern.test(d.id||"")||
       !fpPattern.test(d.peerFingerprint||"")||
       !alive()||fingerprint()!==d.peerFingerprint)return;
    if(d.action==="request"){
      if(document.hidden||incoming||requested||approved||recording){
        rtc.send("deny",d.id);return;
      }
      incoming={id:d.id,peerFingerprint:d.peerFingerprint,
        at:Date.now()};
      hideConsent();msg("incoming");
      setTimeout(()=>{
        if(incoming?.id===d.id){
          incoming=null;hideConsent();rtc.send("deny",d.id);msg("timeout");
        }
      },PREPARED_EXPIRES_MS);
    }else if(d.action==="allow"){
      if(!requested||requested.id!==d.id||
         requested.peerFingerprint!==d.peerFingerprint||
         Date.now()>requested.deadline)return;
      approved={id:d.id,kind:requested.kind,
        requestedAt:requested.at,approvedAt:new Date().toISOString(),
        peerFingerprint:d.peerFingerprint,expires:requested.deadline};
      requested=null;hideConsent();msg("granted");
    }else if(d.action==="deny"){
      if(requested?.id===d.id){requested=null;hideConsent();msg("denied");}
      if(approved?.id===d.id){approved=null;hideConsent();msg("denied");}
    }else if(d.action==="start"){
      remoteActive={id:d.id};hideConsent();msg("peerStarted");
    }else if(d.action==="stop"){
      remoteActive=null;
      if(recording?.id===d.id)stopCapture("stopped",false);
      hideConsent();
    }
  });
  document.addEventListener("ezero:channel-state",e=>{
    if(!e.detail?.connected){
      stopCapture("stopped",false);clearPermits();
    }
  });
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden&&recording)stopCapture("stopped");
  });
  window.addEventListener("pagehide",()=>{
    stopCapture("stopped",false);clearPermits();proof.clearAll();
  });
  function render(entries){
    const list=$("ezeroEvidenceList");
    list.replaceChildren();
    if(!entries.length){const p=document.createElement("p");p.textContent=t("none");
      list.append(p);return;}
    for(const entry of entries){
      const box=document.createElement("div");box.className="ezero-evidence-entry";
      const label=document.createElement("span");
      const seconds=Math.max(0,Math.ceil((entry.expiresAt-Date.now())/1000));
      label.textContent=entry.kind+" · "+seconds+"s · "+
        Math.ceil(entry.size/1024)+" KiB";
      const button=document.createElement("button");button.type="button";
      button.textContent=t("save");button.disabled=seconds===0;
      button.addEventListener("click",async()=>{
        if(button.disabled)return;button.disabled=true;
        try{
          const result=await proof.packageEvidence(entry.id);
          const url=URL.createObjectURL(result.archive);
          const link=document.createElement("a");
          link.href=url;link.download=result.filename;
          link.rel="noopener";link.click();
          setTimeout(()=>URL.revokeObjectURL(url),60000);
          msg("saved");
        }catch(_){msg("downloadFail");}
        finally{button.disabled=false;}
      });
      box.append(label,button);list.append(box);
    }
  }
  proof.onChange(render);
  // Update visible countdown only; expiration is enforced independently by
  // the proof module and rechecked on every attempted download.
  countdown=setInterval(()=>{
    if(!document.hidden)render(proof.list());
  },10000);
  window.addEventListener("pagehide",()=>clearInterval(countdown));
  const localize=()=>{
    $("ezeroEvidenceAsk").textContent=t("requestButton");
    $("ezeroEvidenceApprove").textContent=t("accept");
    $("ezeroEvidenceDeny").textContent=t("reject");
    $("ezeroEvidenceStart").textContent=t("startButton");
    $("ezeroEvidenceStop").textContent=t("stopButton");
    $("ezeroEvidenceImportInfo").textContent=t("importNote");
    render(proof.list());
  };
  $("language")?.addEventListener("change",localize);
  localize();hideConsent();msg("idle");
})();