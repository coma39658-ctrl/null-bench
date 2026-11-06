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
  let requested=null,incoming=null,approved=null,recording=null,remoteActive=null,remoteGranted=null,destroyed=false;
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
      downloadFail:"ثبوت نہیں بن سکا یا 10 منٹ ختم ہو گئے۔",
      original:"⬇ اصل فائل ڈاؤن لوڈ",originalSaved:"اصل فائل ڈاؤن لوڈ کے لیے فراہم کی گئی؛ کوئی SHA-256 یا دستخط نہیں بنائے گئے۔",
      evidenceChoice:"🔐 اسے ثبوت کے طور پر محفوظ کریں (SHA-256)",
      evidenceDetails:"صرف آپ کے اگلے بٹن دبانے پر SHA-256 اور ڈیجیٹل دستخط بنیں گے؛ وقت اور قانونی شناخت کی آزاد تصدیق نہیں۔",
      evidenceCreate:"⬇ SHA-256 + دستخط شدہ ثبوت تیار کرکے ڈاؤن لوڈ کریں"},
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
      downloadFail:"Evidence failed or the 10-minute window expired.",
      original:"⬇ Download original file",originalSaved:"Original media download started. No SHA-256 evidence or digital signature generated.",
      evidenceChoice:"🔐 Save as evidence (SHA-256)",
      evidenceDetails:"SHA-256 and device signature are only generated when you press the evidence download button. Device time and identity are unverified.",
      evidenceCreate:"⬇ Generate and download signed SHA-256 evidence"},
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
      downloadFail:"فشل إنشاء الدليل أو انتهت المهلة.",
      original:"⬇ تنزيل الملف الأصلي",originalSaved:"بدأ تنزيل الملف الأصلي دون إنشاء بصمة SHA-256 أو توقيع.",
      evidenceChoice:"🔐 الاحتفاظ كدليل (SHA-256)",
      evidenceDetails:"لا تُنشأ البصمة أو التوقيع إلا عند الضغط على تنزيل الدليل. الوقت والهوية غير موثقين مستقلاً.",
      evidenceCreate:"⬇ إنشاء وتنزيل الدليل الموقّع SHA-256"}
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
    $("ezeroEvidenceRevoke").hidden=!(remoteGranted||remoteActive);
  }
  function clearPermits(){requested=null;incoming=null;approved=null;remoteActive=null;remoteGranted=null;hideConsent();}
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
    const localAudio=local.getAudioTracks().filter(t=>t.readyState==="live"&&t.enabled);
    const remoteAudio=remote.getAudioTracks().filter(t=>t.readyState==="live"&&t.enabled);
    if(!localAudio.length||!remoteAudio.length)
      throw Error("FULL_TWO_WAY_AUDIO_UNAVAILABLE");
    const audios=[...localAudio,...remoteAudio];
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw Error("AUDIO_MIXER_UNSUPPORTED");
    const audioContext=new Audio();
    const destination=audioContext.createMediaStreamDestination();
    const ownedTracks=[];
    let drawTimer=null;
    try{
    for(const track of audios){
      const copy=track.clone();ownedTracks.push(copy);
      const source=audioContext.createMediaStreamSource(new MediaStream([copy]));
      source.connect(destination);
    }
    const combined=new MediaStream(destination.stream.getAudioTracks());
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
    }catch(error){
      clearInterval(drawTimer);
      for(const track of ownedTracks){try{track.stop();}catch(_){}}
      try{audioContext.close();}catch(_){}
      throw error;
    }
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
      if(!alive())throw Error("PEER_DISCONNECTED");
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
        if(destroyed||!job.chunks.length)return;
        try{
          const blob=new Blob(job.chunks,{type:job.recorder.mimeType});
          proof.offer({blob,kind:withVideo?"call_video":"call_audio",
            source:"LOCAL_CONSENTED_WEBRTC_CAPTURE",
            consent:"LOCAL_AND_PEER_UI_APPROVAL_REPORTED",
            consentDetails:{recordingConsentId:id,peerFingerprint,requestedAtDevice:requestedAt,
              peerApprovalObservedAtDevice:approvedAt,startedAtDevice:job.startedAt,
              stoppedAtDevice:new Date().toISOString(),
              peerConsentVerification:"P2P_DATA_CHANNEL_EVENT_NOT_EXTERNALLY_ATTESTED"}
          });
          msg("stopped");
        }catch(_){msg("failed");}
      };
      job.recorder.start(1000);
      recording=job;
      if(!rtc.send("start",id)){
        job.chunks=[];stopCapture("failed",false);
        throw Error("PEER_INFORM_FAILED");
      }
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
    remoteGranted={id,expires:Date.now()+PREPARED_EXPIRES_MS};
    incoming=null;hideConsent();msg("prepared");
    setTimeout(()=>{
      if(remoteGranted?.id===id){
        remoteGranted=null;hideConsent();msg("timeout");
      }
    },PREPARED_EXPIRES_MS);
  });
  $("ezeroEvidenceDeny").addEventListener("click",()=>{
    if(incoming&&alive())rtc.send("deny",incoming.id);
    incoming=null;hideConsent();msg("denied");
  });
  $("ezeroEvidenceRevoke").addEventListener("click",()=>{
    const id=remoteActive?.id||remoteGranted?.id;
    if(id&&alive())rtc.send("stop",id);
    remoteGranted=null;remoteActive=null;hideConsent();msg("stopped");
  });
  $("ezeroEvidenceStart").addEventListener("click",startCapture);
  $("ezeroEvidenceStop").addEventListener("click",()=>stopCapture("stopped"));
  // Existing consented voice-note drafts can be downloaded with a new
  // signed evidence ZIP. No silent server upload and no auto file download.
  let ownVoiceDraftEvidence=null;
  document.addEventListener("ezero:evidence-voice-draft-local",e=>{
    const blob=e.detail?.blob;
    if(!(blob instanceof Blob)||blob.size<1||blob.size>23000)return;
    if(ownVoiceDraftEvidence)proof.expire(ownVoiceDraftEvidence);
    try{
      ownVoiceDraftEvidence=proof.offer({blob,kind:"voice_note",
        source:"LOCAL_VOICE_NOTE_CAPTURE",
        consent:"AUTHOR_EXPLICIT_RECORD_BUTTON"});
    }catch(_){ownVoiceDraftEvidence=null;}
  });
  $("ezeroVoiceClear")?.addEventListener("click",()=>{
    // Discard means discard, not keeping an unnoticed second copy.
    if(ownVoiceDraftEvidence){
      proof.expire(ownVoiceDraftEvidence);ownVoiceDraftEvidence=null;
    }
  });
  document.addEventListener("ezero:voice-note-received",e=>{
    const d=e.detail;
    // A sender who did not opt in to export leaves only the pre-existing
    // listen-once behavior; no E-ZERO download option is added.
    if(d?.exportAllowed!==true||typeof d.audio!=="string"||
       d.audio.length>32000||
       !["audio/webm","audio/mp4","audio/ogg"].includes(d.mime))return;
    try{
      const raw=atob(d.audio);
      if(raw.length<1||raw.length>24000)return;
      const blob=new Blob([Uint8Array.from(raw,c=>c.charCodeAt(0))],
        {type:d.mime});
      proof.offer({blob,kind:"voice_note",
        source:"PEER_WEBRTC_VOICE_NOTE_OPT_IN",
        consent:"SENDER_EXPORT_ALLOWED_P2P_UNATTESTED"});
    }catch(_){}
  });
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
      if(!remoteGranted||remoteGranted.id!==d.id||
         Date.now()>remoteGranted.expires)return;
      remoteGranted=null;remoteActive={id:d.id};
      hideConsent();msg("peerStarted");
    }else if(d.action==="stop"){
      remoteActive=null;remoteGranted=null;
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
    destroyed=true;
    if(recording)recording.chunks=[];
    stopCapture("stopped",false);clearPermits();proof.clearAll();
  });
  // Selection changes the UI only. Hash/signing are deliberately delayed
  // until the user explicitly clicks "Generate signed evidence".
  const selectedEvidence=new Set();
  const busyExports=new Set();
  function download(blob,filename){
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;link.download=filename;link.rel="noopener";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  function render(entries){
    const list=$("ezeroEvidenceList");
    list.replaceChildren();
    const ids=new Set(entries.map(x=>x.id));
    for(const id of [...selectedEvidence])if(!ids.has(id))selectedEvidence.delete(id);
    if(!entries.length){const p=document.createElement("p");p.textContent=t("none");
      list.append(p);return;}
    for(const entry of entries){
      const box=document.createElement("div");box.className="ezero-evidence-entry";
      const label=document.createElement("span");label.className="ezero-evidence-entry-meta";
      const seconds=Math.max(0,Math.ceil((entry.expiresAt-Date.now())/1000));
      const available=seconds>0;
      label.textContent=entry.kind+" · "+seconds+"s · "+
        Math.ceil(entry.size/1024)+" KiB";
      const original=document.createElement("button");
      original.type="button";original.textContent=t("original");
      original.disabled=!available||busyExports.has(entry.id);
      original.addEventListener("click",()=>{
        if(original.disabled||busyExports.has(entry.id))return;
        try{
          // This path returns the exact same media Blob without hashing,
          // signing or creating a ZIP. A sender must already have allowed
          // recipient export before a received voice note can appear here.
          const result=proof.downloadOriginal(entry.id);
          download(result.blob,result.filename);msg("originalSaved");
        }catch(_){msg("downloadFail");}
      });
      const toggleLabel=document.createElement("label");
      toggleLabel.className="ezero-evidence-choice";
      const toggle=document.createElement("input");
      toggle.type="checkbox";toggle.className="ezero-evidence-select";
      toggle.checked=selectedEvidence.has(entry.id);
      toggle.disabled=!available;
      const choiceText=document.createElement("span");choiceText.textContent=t("evidenceChoice");
      toggleLabel.append(toggle,choiceText);
      const details=document.createElement("div");
      details.className="ezero-evidence-proof-actions";
      details.hidden=!toggle.checked||!available;
      const note=document.createElement("small");note.textContent=t("evidenceDetails");
      const create=document.createElement("button");create.type="button";
      create.className="ezero-evidence-generate";
      create.textContent=t("evidenceCreate");
      create.disabled=!available||busyExports.has(entry.id);
      toggle.addEventListener("change",()=>{
        // Selecting alone MUST NOT invoke packageEvidence or digest/sign.
        if(toggle.checked)selectedEvidence.add(entry.id);
        else selectedEvidence.delete(entry.id);
        details.hidden=!toggle.checked||!available;
      });
      create.addEventListener("click",async()=>{
        if(!toggle.checked||!selectedEvidence.has(entry.id)||
           create.disabled||busyExports.has(entry.id))return;
        busyExports.add(entry.id);create.disabled=true;original.disabled=true;
        try{
          // This call alone generates SHA-256, ECDSA, and the evidence ZIP.
          const result=await proof.packageEvidence(entry.id);
          download(result.archive,result.filename);
          msg("saved");
        }catch(_){msg("downloadFail");}
        finally{
          busyExports.delete(entry.id);
          create.disabled=!available;original.disabled=!available;
        }
      });
      details.append(note,create);
      box.append(label,original,toggleLabel,details);list.append(box);
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