/* E-ZERO AI Studio: opt-in local transcript, hands-free voice and shareable audio.
 * Never records audio automatically, never uploads a saved transcript, and
 * never claims browser TTS can be exported as an audio file.
 */
(function () {
  "use strict";
  const SHARE_URL="https://coma39658-ctrl.github.io/null-bench/ai.html";
  const DB_NAME="ezero-ai-studio-private-transcript-v1";
  const OPT_IN="ezero_ai_studio_save_consent_v1";
  const $=id=>document.getElementById(id);
  const status=(s,bad=false)=>{const e=$("ezeroConversationStatus");if(e){e.textContent=s;e.dataset.error=bad?"true":"false";}};
  const safeText=s=>String(s||"").replace(/\s+/g," ").trim();
  const loadedAudioUrls=[];
  let dbPromise=null,voiceMode=false,recognition=null,listening=false,speaking=false,finalSpeech="",answerPending=false;
  let previousAnswerLength=null,restoring=false;
  let persistedTotal=0;
  function storageConsent(){try{return localStorage.getItem(OPT_IN)==="yes";}catch(_){return false;}}
  function setStorageConsent(value){try{localStorage.setItem(OPT_IN,value?"yes":"no");return true;}catch(_){return false;}}
  function openDB(){
    if(!("indexedDB" in window))return Promise.reject(Error("STORAGE_UNAVAILABLE"));
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains("messages"))db.createObjectStore("messages",{keyPath:"id",autoIncrement:true});};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(Error("STORAGE_FAILED"));
    }).catch(e=>{dbPromise=null;throw e;});
    return dbPromise;
  }
  async function storeMessage(data){
    if(!storageConsent()||restoring||!data||!["user","assistant"].includes(data.role))return;
    const text=String(data.text||"").slice(0,12000);
    if(!text)return;
    try{
      const db=await openDB();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction("messages","readwrite");
        tx.objectStore("messages").add({role:data.role,text,date:new Date().toISOString(),source:String(data.source||"").slice(0,60)});
        tx.oncomplete=resolve;tx.onerror=()=>reject(Error("STORAGE_WRITE_FAILED"));tx.onabort=()=>reject(Error("STORAGE_WRITE_FAILED"));
      });
      persistedTotal++;updateCount();
    }catch(_){status("مقامی ریکارڈ محفوظ نہیں ہو سکا۔ اسٹوریج کی اجازت/جگہ چیک کریں۔",true);}
  }
  async function loadStored(){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction("messages","readonly");
      const request=tx.objectStore("messages").getAll();
      request.onsuccess=()=>resolve(request.result||[]);
      request.onerror=()=>reject(Error("STORAGE_READ_FAILED"));
    });
  }
  async function deleteStored(){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction("messages","readwrite");
      tx.objectStore("messages").clear();
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(Error("STORAGE_DELETE_FAILED"));
    });
  }
  function updateCount(){const e=$("ezeroStoredCount");if(e)e.textContent=persistedTotal?"محفوظ پیغامات: "+persistedTotal:"ابھی کوئی مقامی پیغام محفوظ نہیں";}
  async function restoreSaved(){
    if(!storageConsent())return;
    try{
      const all=await loadStored();persistedTotal=all.length;updateCount();
      const bridge=window.EZERO_AI_STUDIO_BRIDGE_V0_1;
      if(all.length&&bridge&&typeof bridge.restoreMessages==="function"){
        restoring=true;
        bridge.restoreMessages(all.slice(-80));
        restoring=false;
        status("مقامی ریکارڈ لوڈ ہو گیا۔ یہاں آخری "+Math.min(all.length,80)+" پیغامات دکھائے گئے ہیں۔");
      }
    }catch(_){restoring=false;status("مقامی ریکارڈ دستیاب نہیں؛ گفتگو محفوظ ہونے کا دعویٰ نہیں کیا جا سکتا۔",true);}
  }
  function localeFor(text){
    const choice=$("lang")?.value;
    if(!safeText(text)&&(!choice||choice==="auto"))return document.documentElement.lang==="ar"?"ar-SA":"ur-PK";
    if(choice==="ur")return "ur-PK";
    if(choice==="ar")return "ar-SA";
    if(choice==="en")return "en-US";
    if(choice==="hi")return "hi-IN";
    if(/[\u0900-\u097f]/u.test(text))return "hi-IN";
    if(/[\u0600-\u06ff]/u.test(text))return /[ٹڈڑںےکگپچژ]/u.test(text)?"ur-PK":"ar-SA";
    return "en-US";
  }
  function readChunks(text){
    const words=safeText(text).split(" "),chunks=[];let current="";
    for(const word of words){if((current+" "+word).length>185&&current){chunks.push(current);current="";}current+=(current?" ":"")+word;}
    if(current)chunks.push(current);
    return chunks;
  }
  function voiceStop(){
    if(recognition){try{recognition.abort();}catch(_){}recognition=null;}
    listening=false;speaking=false;answerPending=false;
    try{window.speechSynthesis?.cancel();}catch(_){}
  }
  function endConversation(){
    voiceMode=false;voiceStop();
    const b=$("ezeroFaceTalkBtn");if(b){b.textContent="🎙️ بات چیت شروع کریں";b.setAttribute("aria-pressed","false");}
    if(previousAnswerLength!==null){const length=$("answerLength");if(length)length.value=previousAnswerLength;previousAnswerLength=null;}
    status("صوتی گفتگو بند ہے۔ عام چیٹ اور متن محفوظ کرنے کا اختیار برقرار ہے۔");
  }
  function startListening(){
    if(!voiceMode||listening||speaking||answerPending)return;
    const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Speech){status("یہ براؤزر Speech Recognition فراہم نہیں کرتا؛ Chrome میں مائک آزمائیں یا لکھ کر سوال کریں۔",true);endConversation();return;}
    try{
      const r=new Speech();recognition=r;finalSpeech="";
      r.lang=localeFor($("prompt")?.value||"");r.continuous=false;r.interimResults=true;r.maxAlternatives=1;
      r.onstart=()=>{listening=true;status("🎤 سن رہا ہوں… بولنا مکمل کریں۔ براؤزر کی اجازت ضروری ہے۔");};
      r.onresult=event=>{
        let last="",done="";
        for(let i=event.resultIndex;i<event.results.length;i++){
          const item=event.results[i],part=item[0]?.transcript||"";
          last=part;if(item.isFinal)done+=part+" ";
        }
        if(done)finalSpeech+=done;
        if(last)status("🎤 "+safeText(last).slice(0,130));
      };
      r.onerror=event=>{listening=false;status("مائک کی شناخت: "+String(event.error||"نامعلوم")+". دوبارہ شروع کرنے کے لیے مائک دبائیں۔",true);};
      r.onend=()=>{
        listening=false;recognition=null;
        if(!voiceMode)return;
        const text=safeText(finalSpeech);
        if(text){
          const p=$("prompt"),form=$("form");
          if(!p||!form)return;
          p.value=text;p.dispatchEvent(new Event("input",{bubbles:true}));
          answerPending=true;status("AI سے مختصر جواب لیا جا رہا ہے…");
          if(typeof form.requestSubmit==="function")form.requestSubmit();else $("send")?.click();
        }else{status("آواز واضح نہیں ملی۔ دوبارہ بولنے کے لیے 'مائک دوبارہ' دبائیں۔");}
      };
      r.start();
    }catch(_){listening=false;status("مائک شروع نہیں ہوا۔ فون کی اجازت یا براؤزر چیک کریں۔",true);}
  }
  function playVoiceResponse(text){
    if(!voiceMode)return;
    if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){
      status("آواز سنانے کی سہولت فون میں دستیاب نہیں؛ جواب تحریر میں موجود ہے۔",true);return;
    }
    const chunks=readChunks(text);
    if(!chunks.length)return;
    speaking=true;status("🔊 AI جواب سنا رہا ہے… روکنے کے لیے بند دبائیں۔");
    try{window.speechSynthesis.cancel();}catch(_){}
    const voices=window.speechSynthesis.getVoices?.()||[];
    const language=localeFor(text);
    const voice=voices.find(v=>v.lang.toLowerCase()===language.toLowerCase())
      ||voices.find(v=>v.lang.toLowerCase().startsWith(language.slice(0,2).toLowerCase()+"-"));
    let cursor=0;
    function next(){
      if(!voiceMode){speaking=false;return;}
      if(cursor>=chunks.length){
        speaking=false;
        status("✓ جواب مکمل۔ اگلا سوال بولیں، یا مائک دبائیں۔");
        // Auto-relisten only after explicit voice mode activation, when permitted.
        startListening();
        return;
      }
      const u=new SpeechSynthesisUtterance(chunks[cursor++]);
      u.lang=voice?.lang||language;u.rate=1.16;u.pitch=1;if(voice)u.voice=voice;
      u.onend=next;
      u.onerror=()=>{speaking=false;status("براؤزر نے آواز روک دی؛ جواب تحریر میں دستیاب ہے۔ دوبارہ مائک دبائیں۔",true);};
      try{window.speechSynthesis.speak(u);}catch(_){speaking=false;status("آواز نہیں چل سکی۔",true);}
    }
    next();
  }
  function startConversation(){
    if(voiceMode){endConversation();return;}
    const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Speech){status("اس براؤزر میں دوطرفہ مائک گفتگو دستیاب نہیں؛ فون کے Chrome میں آزمائیں۔",true);return;}
    voiceMode=true;
    const length=$("answerLength");if(length){previousAnswerLength=length.value;length.value="short";}
    const b=$("ezeroFaceTalkBtn");if(b){b.textContent="■ گفتگو بند کریں";b.setAttribute("aria-pressed","true");}
    startListening();
  }
  const SHARE_CAPTION="🎙️ E-ZERO AI Studio — صوتی معاون\nلنک کھولنا اور انسٹال کرنا آپ کی مرضی ہے:\n"+SHARE_URL;
  const shareTextFor=text=>"E-ZERO AI Studio | AI جواب\n\n"+safeText(text).slice(0,1900)+"\n\n"+SHARE_CAPTION;
  function brandedAudioText(answer,voiceId){
    // Audible brand credit is disclosed to the sender; no hidden advertising.
    const intro=voiceId.startsWith("ur_")?"ای زیرو اے آئی اسٹوڈیو۔ ":
      voiceId.startsWith("ar_")?"إي زيرو إيه آي ستوديو. ":"E-ZERO AI Studio. ";
    return intro+answer;
  }
  async function shareText(text){
    const value=shareTextFor(text);
    if(navigator.share){try{await navigator.share({title:"E-ZERO AI Studio",text:value});return;}catch(e){if(e?.name==="AbortError")return;}}
    try{await navigator.clipboard.writeText(value);status("جواب اور ویب سائٹ کا لنک کاپی ہو گیا؛ WhatsApp میں پیسٹ کریں۔");}
    catch(_){status("شیئرنگ دستیاب نہیں؛ جواب کا متن منتخب کر کے شیئر کریں۔",true);}
  }
  function piperId(text){
    const lang=localeFor(text);
    return lang.startsWith("ur")?"ur_PK-aegis_female-medium":
      lang.startsWith("ar")?"ar_JO-kareem-low":
      lang.startsWith("en")?"en_US-amy-low":null;
  }
  function downloadFile(file){
    const url=URL.createObjectURL(file);loadedAudioUrls.push(url);
    const a=document.createElement("a");a.href=url;a.download=file.name;a.click();
  }
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  async function makePrivateAudioCard(file,answer){
    // A portable HTML attachment: audio + consent-first website link, no upload.
    // This is not a hosted URL and must not be presented as one.
    if(file.size>8*1024*1024)throw Error("AUDIO_TOO_LARGE_FOR_CARD");
    const base64=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||"").split(",")[1]||"");
      reader.onerror=()=>reject(Error("AUDIO_READ_FAILED"));
      reader.readAsDataURL(file);
    });
    if(!base64)throw Error("AUDIO_READ_FAILED");
    const safe=escapeHTML(answer.slice(0,1500));
    const html='<!doctype html><html lang="ur" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<meta name="referrer" content="no-referrer"><meta name="color-scheme" content="light dark"><title>E-ZERO AI Studio · Shared Voice</title>'+
      '<style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;padding:20px;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#e1edf0;color:#173849}main{width:min(100%,540px);padding:24px;border-radius:22px;background:#f7fbfc;border:1px solid #a9cbd3;box-shadow:0 12px 36px #17384922}h1{font-size:24px}p{line-height:1.8}audio{width:100%;margin:16px 0}a{display:block;padding:13px;border-radius:12px;background:#087589;color:#fff;text-decoration:none;text-align:center;font-weight:800;margin:10px 0}.muted{font-size:13px;color:#4c6874;line-height:1.8}blockquote{white-space:pre-wrap;overflow-wrap:anywhere;border-right:3px solid #087589;padding:10px 14px;background:#e8f2f5;border-radius:8px}@media(prefers-color-scheme:dark){body{background:#102c39;color:#ecf7f9}main{background:#1b3948;border-color:#4b788a}.muted{color:#bed4dc}blockquote{background:#294b5c}}</style></head><body><main>'+
      '<p>🎙️ E-ZERO AI Studio · Voice & Intelligence</p><h1>شیئر کیا گیا AI آڈیو جواب</h1>'+
      '<audio controls preload="metadata" aria-label="شیئر کردہ E-ZERO AI آواز"><source type="audio/wav" src="data:audio/wav;base64,'+base64+'">آپ کا براؤزر آڈیو نہیں چلا سکتا۔</audio>'+
      '<h2>جواب کا متن</h2><blockquote>'+safe+'</blockquote>'+
      '<p class="muted">یہ صرف بھیجنے والے کا منتخب کردہ AI جواب ہے، پوری نجی گفتگو نہیں۔ کوئی ریکارڈ خودکار طور پر اپ لوڈ نہیں کیا گیا۔</p>'+
      '<a href="'+SHARE_URL+'" target="_blank" rel="noopener noreferrer">🔗 میری رضامندی سے E-ZERO AI کھولیں</a>'+
      '<p class="muted">ویب سائٹ کھولنے کے بعد اگر آپ چاہیں تو Install / Add to Home Screen منتخب کریں۔ انسٹال خودکار نہیں ہوتا۔</p>'+
      '<p class="muted">© E-ZERO · AI Studio · معلوماتی جواب، تصدیق شدہ گاڑی کی تشخیص نہیں۔</p></main></body></html>';
    return new File([html],"E-ZERO-AI-Voice-Listen.html",{type:"text/html"});
  }
  function audioShareTools(tools,text){
    const t=safeText(text);
    const share=document.createElement("button");share.type="button";share.className="miniButton";share.textContent="↗ متن و لنک شیئر";
    share.addEventListener("click",()=>shareText(text));
    const shareLink=document.createElement("button");shareLink.type="button";shareLink.className="miniButton";shareLink.textContent="🔗 E-ZERO لنک کاپی";
    shareLink.setAttribute("aria-label","آڈیو کے ساتھ شیئر کرنے کے لیے E-ZERO AI Studio کا رضامندی والا لنک کاپی کریں");
    shareLink.addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText(SHARE_CAPTION);status("E-ZERO کا مختصر تعارف اور لنک کاپی ہوگیا؛ WhatsApp میں آڈیو کے ساتھ بھیجیں۔");}
      catch(_){status("لنک کاپی نہیں ہوا۔ "+SHARE_URL,true);}
    });
    const make=document.createElement("button");make.type="button";make.className="miniButton";make.textContent="🔊 E-ZERO حوالہ کے ساتھ WAV آڈیو";
    make.title="AI جواب کی مقامی WAV فائل بنائیں؛ آغاز میں E-ZERO AI Studio کا مختصر صوتی حوالہ شامل ہوگا۔ پہلی بار آواز کا ماڈل ڈاؤن لوڈ ہو سکتا ہے۔";
    let cachedAudio=null;
    make.addEventListener("click",async()=>{
      if(make.disabled)return;
      if(cachedAudio){downloadFile(cachedAudio);return;}
      const voiceId=piperId(t);
      if(!voiceId){status("اس زبان کی مقامی WAV AI آواز ابھی دستیاب نہیں۔ متن اور لنک شیئر کیے جا سکتے ہیں۔",true);return;}
      if(t.length>1500){status("آڈیو صرف 1500 حروف تک تیار ہوتی ہے؛ مکمل جواب شیئر کرنے کے لیے متن استعمال کریں۔",true);return;}
      make.disabled=true;make.textContent="آواز تیار ہو رہی ہے…";
      try{
        // Downloads a voice model on first request; browser TTS cannot be captured.
        const mod=await import("./vendor/ezero-piper-urdu/piper-tts-web-urdu.mjs");
        const session=await mod.TtsSession.create({voiceId});
        const blob=await session.predict(brandedAudioText(t,voiceId));
        if(!blob||!blob.size)throw Error("EMPTY_AUDIO");
        const file=new File([blob],"E-ZERO-AI-Studio-Voice.wav",{type:"audio/wav"});
        cachedAudio=file;
        make.textContent="⬇ آڈیو محفوظ کریں";
        make.disabled=false;
        const send=document.createElement("button");send.type="button";send.className="miniButton";send.textContent="↗ WhatsApp / آڈیو شیئر";
        send.addEventListener("click",async()=>{
          if(navigator.share&&navigator.canShare?.({files:[file]})){
            try{await navigator.share({title:"E-ZERO AI Studio | Voice",text:SHARE_CAPTION,files:[file]});status("آڈیو شیئر آپشن کھلا۔ کچھ ایپس فائل کے ساتھ لنک نہیں بھیجتیں؛ ضرورت ہو تو 🔗 لنک الگ شیئر کریں۔");return;}
            catch(e){if(e?.name==="AbortError")return;}
          }
          downloadFile(file);
          status("AI جواب کی WAV آڈیو فون پر محفوظ ہو گئی۔ WhatsApp میں فائل اور 🔗 E-ZERO لنک الگ شامل کریں۔");
        });
        tools.appendChild(send);
        const listen=document.createElement("button");listen.type="button";listen.className="miniButton";
        listen.textContent="▶ آڈیو + متن + انسٹال لنک (HTML)";
        listen.title="وصول کنندہ آڈیو سن سکتا ہے، منتخب جواب پڑھ سکتا ہے، اور اپنی رضامندی سے E-ZERO کھول کر انسٹال کر سکتا ہے۔";
        listen.addEventListener("click",async()=>{
          listen.disabled=true;
          try{
            const card=await makePrivateAudioCard(file,t);
            if(navigator.share&&navigator.canShare?.({files:[card]})){
              try{await navigator.share({title:"E-ZERO AI Studio · Voice",files:[card]});
                status("آڈیو سننے والا HTML کارڈ شیئر آپشن میں بھیجا گیا۔ وصول کنندہ اسے فائل کے طور پر کھول سکتا ہے۔");return;}
              catch(e){if(e?.name==="AbortError")return;}
            }
            downloadFile(card);
            status("آڈیو، منتخب متن اور انسٹال لنک والا HTML کارڈ محفوظ ہو گیا۔ اسے WhatsApp میں Document کے طور پر شیئر کریں۔");
          }catch(_){status("آڈیو کارڈ نہیں بن سکا؛ WAV فائل یا متن/لنک الگ شیئر کریں۔",true);}
          finally{listen.disabled=false;}
        });
        tools.appendChild(listen);
        status("E-ZERO کا مختصر صوتی حوالہ شامل ہے؛ WAV اور سننے والا HTML کارڈ دستیاب ہیں۔ لنک صارف کی رضامندی سے کھلتا ہے۔");
      }catch(_){make.disabled=false;make.textContent="🔊 دوبارہ WAV بنائیں";status("مقامی آواز کا ماڈل یا انٹرنیٹ دستیاب نہیں؛ اس جواب کی آڈیو فائل تیار نہیں ہوئی۔",true);}
    });
    tools.append(share,shareLink,make);
  }
  // Existing message renderer attaches both actions only on a real AI reply.
  window.EZERO_AI_STUDIO_ATTACH_SHARE_V0_1=audioShareTools;
  function setupUI(){
    const voiceSettings=$("ezeroVoiceSettings");if(!voiceSettings)return;
    const section=document.createElement("section");section.className="ezeroConversationBox";
    section.setAttribute("aria-label","صوتی گفتگو اور مقامی ریکارڈ");
    section.innerHTML='<div class="ezeroConvRow"><button type="button" id="ezeroFaceTalkBtn" aria-pressed="false">🎙️ بات چیت شروع کریں</button><button type="button" id="ezeroVoiceRetryBtn">🎤 مائک دوبارہ</button><button type="button" id="ezeroCopyStudioLink">🔗 لنک کاپی کریں</button></div>'+
      '<div class="ezeroConvRow"><label class="ezeroSaveToggle"><input id="ezeroSaveOptIn" type="checkbox"> میری اجازت سے گفتگو کا متن اس فون میں محفوظ کریں</label><button type="button" id="ezeroClearStored">محفوظ ریکارڈ مٹائیں</button></div>'+
      '<div id="ezeroStoredCount" class="ezeroConvSmall"></div><p id="ezeroConversationStatus" role="status" aria-live="polite" class="ezeroConvSmall">آواز اور ریکارڈ کی اجازت آپ کے اختیار میں ہے۔ AI کی آڈیو الگ سے شیئر کی جا سکتی ہے۔</p>';
    voiceSettings.parentNode.insertBefore(section,voiceSettings);
    $("ezeroFaceTalkBtn").addEventListener("click",startConversation);
    $("ezeroVoiceRetryBtn").addEventListener("click",()=>{if(!voiceMode){startConversation();return;}voiceStop();startListening();});
    $("ezeroCopyStudioLink").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(SHARE_URL);status("E-ZERO AI کا رضامندی والا لنک کاپی ہو گیا۔");}catch(_){status("لنک: "+SHARE_URL);}});
    const checkbox=$("ezeroSaveOptIn");checkbox.checked=storageConsent();
    checkbox.addEventListener("change",async()=>{
      if(!setStorageConsent(checkbox.checked)){checkbox.checked=false;status("اس براؤزر میں مقامی محفوظ کرنے کا اختیار دستیاب نہیں۔",true);return;}
      if(checkbox.checked){
        try{
          await openDB();
          const bridge=window.EZERO_AI_STUDIO_BRIDGE_V0_1;
          const present=bridge?.getTranscript?.()||[];
          for(const item of present)await storeMessage(item);
          status("اجازت مل گئی۔ صرف گفتگو کا متن اسی براؤزر میں محفوظ ہوگا؛ آواز یا تصویر نہیں۔");
        }catch(_){checkbox.checked=false;setStorageConsent(false);status("اس فون میں مقامی ریکارڈ شروع نہیں ہو سکا۔",true);}
      }else{status("آئندہ پیغامات مقامی ریکارڈ میں شامل نہیں ہوں گے۔ سابقہ ریکارڈ مٹانے کے لیے الگ بٹن دبائیں۔");}
    });
    $("ezeroClearStored").addEventListener("click",async()=>{
      if(!window.confirm("کیا آپ E-ZERO Studio کا اس فون پر محفوظ کیا گیا تمام متنی ریکارڈ مٹانا چاہتے ہیں؟"))return;
      try{await deleteStored();persistedTotal=0;updateCount();status("اس فون کا مقامی متنی ریکارڈ مٹا دیا گیا۔");}
      catch(_){status("ریکارڈ مٹانے میں خرابی ہوئی؛ دوبارہ کوشش کریں۔",true);}
    });
    const top=document.querySelector(".topActions");
    if(top){
      const shortcut=document.createElement("button");shortcut.className="ezeroVoiceShortcut";shortcut.type="button";shortcut.textContent="🎙️";shortcut.title="دوطرفہ صوتی گفتگو";shortcut.setAttribute("aria-label","دوطرفہ صوتی گفتگو شروع یا بند کریں");
      shortcut.addEventListener("click",()=>{$("ezeroFaceTalkBtn").click();});
      top.insertBefore(shortcut,top.firstChild);
    }
    const welcome=$("welcome");
    if(welcome){
      const shortcut=document.createElement("button");shortcut.className="ezeroWelcomeVoice";shortcut.type="button";shortcut.textContent="🎙️ مائک سے براہِ راست گفتگو";
      shortcut.addEventListener("click",()=>{$("ezeroFaceTalkBtn").click();});
      welcome.appendChild(shortcut);
    }
    if(location.hash==="#voice")status("صوتی گفتگو تیار ہے۔ اجازت دینے کے لیے 🎙️ بات چیت شروع کریں دبائیں۔");
    restoreSaved();
  }
  window.addEventListener("ezero:studio-message",event=>{
    const detail=event.detail||{};
    storeMessage(detail);
    if(detail.role==="assistant"&&voiceMode){
      answerPending=false;
      playVoiceResponse(detail.text||"");
    }
  });
  window.addEventListener("ezero:studio-error",()=>{if(voiceMode){answerPending=false;status("AI جواب نہیں دے سکا۔ مائک دوبارہ دبائیں۔",true);}});
  window.addEventListener("pagehide",()=>{voiceMode=false;voiceStop();for(const url of loadedAudioUrls)URL.revokeObjectURL(url);});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setupUI);else setupUI();
})();
