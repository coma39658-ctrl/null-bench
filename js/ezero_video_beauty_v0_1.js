/* E-ZERO LIVE beauty lens — opt-in, session-only, on-device video processing.
 * No face analytics or image uploads. Canvas video replaces the sent WebRTC
 * track using replaceTrack (the authenticated call and audio are untouched).
 * Unsupported browsers retain the original camera rather than failing a call.
 */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const panel=$("modernCallPanel");
 if(!document.body?.classList.contains("ezero-one-lab")||!panel)return;
 const styles={
   natural:{label:{ur:"قدرتی",ar:"طبيعي",en:"Natural"},brightness:1,contrast:1,saturate:1,blur:0,blend:0},
   soft:{label:{ur:"ہلکا نرم",ar:"نعومة خفيفة",en:"Soft"},brightness:1.018,contrast:1.012,saturate:1.035,blur:1,blend:.19},
   smooth:{label:{ur:"صاف جلد",ar:"بشرة ناعمة",en:"Smooth"},brightness:1.035,contrast:1.02,saturate:1.06,blur:1.6,blend:.30},
   glow:{label:{ur:"گلو",ar:"إشراق",en:"Glow"},brightness:1.065,contrast:1.025,saturate:1.12,blur:1.1,blend:.23}
 };
 const words={
   ur:{title:"✨ ویڈیو بیوٹی فلٹر",status:"فلٹر صرف آپ کے انتخاب پر چلتا ہے؛ اس کی تصویر کال میں بھیجی جاتی ہے۔",unsupported:"اس براؤزر میں فلٹر نہیں چل سکتا؛ اصل کیمرہ اور کال محفوظ ہیں۔",on:"فلٹر کی تصویر دوست کے WebRTC ویڈیو ٹریک کو بھیجی جا رہی ہے؛ انسانی مشاہدہ باقی ہے۔",off:"قدرتی تصویر — کوئی فلٹر نہیں",error:"فلٹر کی خرابی؛ اصل کیمرہ بحال ہے۔"},
   ar:{title:"✨ فلتر تجميل الفيديو",status:"الفلتر اختياري ويرسل صورة الكاميرا المعالجة في المكالمة.",unsupported:"الفلتر غير متاح؛ الكاميرا والمكالمة الأصلية محفوظتان.",on:"يُرسل مسار الفيديو المعالج عبر WebRTC؛ لم يتم التحقق من رؤيته على الهاتف الآخر.",off:"صورة طبيعية بلا فلتر",error:"تعذّر الفلتر؛ عادت الكاميرا الأصلية."},
   en:{title:"✨ Video beauty lens",status:"Opt-in local filter; processed camera frames are sent in this call.",unsupported:"Filter unsupported here; original camera and call stay active.",on:"Processed WebRTC video track is being sent; remote viewing is not yet verified.",off:"Natural camera — no filter",error:"Filter failed; original camera restored."}
 };
 const ui=document.createElement("label");
 ui.id="ezeroBeautyControls";ui.className="ezero-beauty-controls";
 const name=document.createElement("span");
 const choice=document.createElement("select");
 choice.id="ezeroBeautyPreset";choice.setAttribute("aria-label","Video beauty filter · فلٹر · فلتر");
 for(const k of Object.keys(styles)){const o=document.createElement("option");o.value=k;choice.append(o);}
 ui.append(name,choice);
 const hint=document.createElement("small");hint.id="ezeroBeautyInfo";
 hint.setAttribute("role","status");hint.setAttribute("aria-live","polite");
 panel.append(ui,hint);
 let preset="natural",bound=null,processor=null,raf=0,busy=false,serial=0,notice="status",lastFrame=0;
 // The main language <select> is authoritative during its change event.
 // This script loads before the core language handler, so the root HTML lang
 // may still be the PREVIOUS language when our listener executes.
 const lng=()=>{
   const selected=$("language")?.value;
   return ["ur","ar","en"].includes(selected)?selected:
     (["ur","ar","en"].includes(document.documentElement.lang)?document.documentElement.lang:"ur");
 };
 function translate(){
   name.textContent=words[lng()].title;
   for(const o of choice.options)o.textContent=styles[o.value].label[lng()];
   choice.value=preset;
   hint.textContent=words[lng()][notice]||words[lng()].status;
 }
 function say(key){notice=key;translate();}
 function stopProcessor(){
   if(raf){cancelAnimationFrame(raf);raf=0;}
   if(processor){
     try{processor.track.stop();}catch(_){}
     try{processor.video.pause();processor.video.srcObject=null;}catch(_){}
     processor.canvas.width=0;processor.canvas.height=0;processor=null;
   }
 }
 function draw(now=0){
   if(!processor||!bound)return;
   // Limit continuous canvas work to approximately 20 FPS on mobile.
   // The capture stream also maxes at 20; never run a 60 FPS blur loop.
   if(now&&now-lastFrame<48){raf=requestAnimationFrame(draw);return;}
   lastFrame=now;
   const p=processor,source=p.video,ctx=p.ctx,canvas=p.canvas;
   if(source.readyState>=2&&!source.paused&&source.videoWidth){
     const w=canvas.width,h=canvas.height,s=styles[preset];
     ctx.globalAlpha=1;
     ctx.filter=`brightness(${s.brightness}) contrast(${s.contrast}) saturate(${s.saturate})`;
     ctx.drawImage(source,0,0,w,h);
     if(s.blend){
       ctx.globalAlpha=s.blend;
       ctx.filter=`blur(${s.blur}px) brightness(1.02)`;
       ctx.drawImage(source,0,0,w,h);
     }
     ctx.filter="none";ctx.globalAlpha=1;
   }
   raf=requestAnimationFrame(draw);
 }
 function getRaw(){
   return bound?.stream?.getVideoTracks?.().find(t=>t.readyState==="live")||null;
 }
 function sender(){
   return bound?.peer?.getSenders?.().find(s=>s.track?.kind==="video")||null;
 }
 async function apply(){
   if(busy||!bound)return;
   busy=true;
   const target=bound,seq=++serial;
   try{
     const raw=getRaw(),send=sender();
     if(!raw||!send||target.peer.connectionState==="closed"){say("unsupported");return;}
     if(preset==="natural"){
       await send.replaceTrack(raw);
       if(bound!==target)return;
       target.preview.srcObject=target.stream;
       stopProcessor();
       say("off");return;
     }
     if(processor){
       if(send.track!==processor.track)await send.replaceTrack(processor.track);
       if(bound!==target)return;
       target.preview.srcObject=processor.display;
       say("on");return;
     }
     if(!HTMLCanvasElement.prototype.captureStream){say("unsupported");return;}
     const video=document.createElement("video");
     video.muted=true;video.playsInline=true;video.autoplay=true;video.srcObject=target.stream;
     await video.play();
     if(video.readyState<2){
       await Promise.race([
         new Promise(resolve=>video.addEventListener("loadeddata",resolve,{once:true})),
         new Promise(resolve=>setTimeout(resolve,1200))
       ]);
     }
     if(target!==bound||seq!==serial){video.pause();video.srcObject=null;return;}
     if(!video.videoWidth){video.pause();video.srcObject=null;say("unsupported");return;}
     const width=Math.min(1280,video.videoWidth),height=Math.round(video.videoHeight*width/video.videoWidth);
     const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
     const ctx=canvas.getContext("2d",{alpha:false,desynchronized:true});
     if(!ctx){video.pause();video.srcObject=null;say("unsupported");return;}
     const stream=canvas.captureStream(20),track=stream.getVideoTracks()[0];
     if(!track){video.pause();video.srcObject=null;say("unsupported");return;}
     processor={video,canvas,ctx,track,display:new MediaStream([track,...target.stream.getAudioTracks()])};
     draw();
     await send.replaceTrack(track);
     if(bound!==target)return;
     target.preview.srcObject=processor.display;
     say("on");
   }catch(_){
     // Optional enhancements are fail-open for media and fail-closed for claims.
     const raw=getRaw(),send=sender();
     if(send&&raw)try{await send.replaceTrack(raw);}catch(_){}
     if(bound)bound.preview.srcObject=bound.stream;
     stopProcessor();
     say("error");
   }finally{busy=false;}
 }
 function detach(){
   ++serial;
   bound=null;
   stopProcessor();
   say("status");
 }
 function attach(stream,peer,preview){
   if(!stream?.getVideoTracks?.().length||!peer||!preview)return;
   detach();
   bound={stream,peer,preview};
   if(preset!=="natural")void apply();
 }
 choice.addEventListener("change",()=>{
   if(!Object.hasOwn(styles,choice.value))return;
   preset=choice.value;
   if(bound)void apply();else say(preset==="natural"?"off":"status");
 });
 $("language")?.addEventListener("change",translate);
 window.addEventListener("pagehide",detach);
 window.EZERO_BEAUTY_FILTER=Object.freeze({attach,detach,
   // A bounded observation for test diagnostics, not physical viewing proof.
   applied:()=>!!processor&&!!bound&&sender()?.track===processor.track,
   preset:()=>preset
 });
 translate();
})();
