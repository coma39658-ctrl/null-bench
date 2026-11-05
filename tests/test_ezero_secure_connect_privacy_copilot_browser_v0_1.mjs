import assert from "node:assert/strict";
import {chromium} from "playwright";
const origin="http://127.0.0.1:8769";
const browser=await chromium.launch({headless:true,args:[
 "--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"
]});
const contexts=[];
async function phone(){
 const ctx=await browser.newContext({
  viewport:{width:393,height:852},isMobile:true,hasTouch:true,
  permissions:["camera","microphone"],locale:"en-US"
 });
 contexts.push(ctx);
 await ctx.route("**/*",route=>{
  if(route.request().url().startsWith(origin+"/"))return route.continue();
  return route.abort("blockedbyclient");
 });
 await ctx.addInitScript(()=>{
  window.__privacyMicCalls=0;
  const orig=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=opts=>{
   window.__privacyMicCalls++;return orig(opts);
  };
 });
 const page=await ctx.newPage();
 page.on("pageerror",error=>{console.log("COPILOT_PAGE_ERROR",String(error).slice(0,180));});
 await page.goto(origin+"/ezero_secure_connect_live_p2p_v0_1.html");
 await page.waitForFunction(()=>document.querySelector("#myFingerprint")?.textContent.trim().length===64);
 await page.locator("#oneQrAdvanced").evaluate(el=>el.open=true);
 return page;
}
let a,b;
try{
 a=await phone();b=await phone();
 await a.locator("#callSetup").evaluate(el=>el.open=true);
 await b.locator("#callSetup").evaluate(el=>el.open=true);
 await a.locator("#copilotPanel").evaluate(el=>el.open=true);
 await b.locator("#copilotPanel").evaluate(el=>el.open=true);
 assert.equal(await a.locator("#copilotSafetyCode").innerText(),"—",
  "Safety code must be absent before peer identity arrives");
 assert.equal(await a.evaluate(()=>window.__privacyMicCalls),0,
  "Privacy Copilot must not activate microphone during page load");
 const signedA=await a.locator("#myDigitalId").inputValue();
 const signedB=await b.locator("#myDigitalId").inputValue();
 await a.locator("#chooseRemote").click();
 await b.locator("#chooseRemote").click();
 await a.locator("#friendIdInput").fill(signedB);
 await a.locator("#verifyFriend").click();
 await b.locator("#friendIdInput").fill(signedA);
 await b.locator("#verifyFriend").click();
 await Promise.all([a,b].map(p=>p.waitForFunction(()=>
  /^\d{6} · \d{6}$/.test(document.querySelector("#copilotSafetyCode")?.textContent||""),
  {timeout:12000})));
 const codeA=await a.locator("#copilotSafetyCode").innerText();
 const codeB=await b.locator("#copilotSafetyCode").innerText();
 assert.equal(codeA,codeB,"Both phones must derive identical safety number");
 assert.match(await a.locator("#copilotIdentity").innerText(),/دستخط شدہ|signed/);
 // Replacing a displayed peer key must never retain trust in the old key.
 await a.locator("#peerFingerprint").evaluate(el=>el.textContent="a".repeat(64));
 await a.waitForFunction(()=>document.querySelector("#copilotIdentity").textContent.includes("نہیں ہوئی"));
 // A stale or forged event with a different fingerprint must not mark it signed.
 await a.evaluate(()=>document.dispatchEvent(new CustomEvent("ezero:friend-verification",{
  detail:{ok:true,signed:true,fingerprint:"b".repeat(64),source:"test"}
 })));
 assert.match(await a.locator("#copilotIdentity").innerText(),/نہیں ہوئی/);
 // Restore the real verified peer identity using the original cryptographic verifier.
 await a.locator("#friendIdInput").fill(signedB);
 await a.locator("#verifyFriend").click();
 await a.waitForFunction(()=>document.querySelector("#copilotIdentity").textContent.includes("چیک ہوئی"));
 assert.equal(await a.locator("#copilotSafetyCode").innerText(),codeB);
 assert.match(await a.locator("#copilotCall").innerText(),/ابھی|No live/);
 console.log("TWO_PHONE_12_DIGIT_SAFETY_COMPARE_NO_FAKE_CONNECTED: PASS");

 await a.locator("#friendIdInput").fill("invalid-name-instead-of-QR");
 await a.locator("#verifyFriend").click();
 assert.match(await a.locator("#copilotIdentity").innerText(),/ناکام|failed/,
  "Failed QR must not retain verified-identity claim");
 await a.locator("#sendText").fill("Your OTP is 123456");
 assert.equal(await a.locator("#copilotRisk").getAttribute("data-state"),"warning");
 assert.match(await a.locator("#copilotRisk").innerText(),/OTP/);
 await a.locator("#sendMessage").evaluate(el=>el.disabled=false);
 await a.locator("#sendMessage").click();
 assert.equal(await a.locator("#copilotOverride").isVisible(),true,
  "Sensitive text must be intercepted before WebRTC datachannel send");
 await a.locator("#sendText").fill("New message https://example.test");
 assert.equal(await a.locator("#copilotOverride").isHidden(),true,
  "Changing the draft cancels earlier sensitive-text override");
 assert.match(await a.locator("#copilotRisk").innerText(),/لنک|link/);
 await a.locator("#sendText").fill("Send money immediately!");
 assert.match(await a.locator("#copilotRisk").innerText(),/رقم|money/);
 await a.locator("#sendText").fill("Hello friend");
 assert.equal(await a.locator("#copilotRisk").getAttribute("data-state"),"neutral");
 assert.match(await a.locator("#copilotRisk").innerText(),/ضمانت نہیں|not prove/);
 console.log("LOCAL_SCAM_HINTS_WITH_EXPLICIT_SENSITIVE_TEXT_RECONFIRMATION: PASS");

 await a.locator("#copilotPhrase").selectOption("verify");
 await a.locator("#copilotPhraseLanguage").selectOption("ar");
 await a.locator("#copilotPhraseUse").click();
 assert.match(await a.locator("#sendText").inputValue(),/هويتك/);
 assert.equal(await a.evaluate(()=>window.__privacyMicCalls),0);
 await a.locator("#sendText").fill("Hello");
 await a.evaluate(()=>{window.Translator=undefined;});
 await a.locator("#copilotTranslate").click();
 assert.match(await a.locator("#copilotTranslationStatus").innerText(),/دستیاب نہیں/);
 await a.evaluate(()=>{
  window.__aiCreateCalled=0;
  window.Translator={
   availability:async()=> "downloadable",
   create:async()=>{window.__aiCreateCalled++;return{translate:async()=> "NEVER",destroy(){}};}
  };
 });
 await a.locator("#copilotTranslate").click();
 assert.equal(await a.evaluate(()=>window.__aiCreateCalled),0,
  "Never silently download local AI model or activate cloud fallback");
 assert.match(await a.locator("#copilotTranslationStatus").innerText(),/ڈاؤن لوڈ نہیں/);
 await a.evaluate(()=>{
  window.__aiCreated=0;
  window.__aiDestroyed=0;
  window.Translator={
   availability:async()=> "available",
   create:async()=>{
    window.__aiCreated++;
    return {translate:async input=>"LOCAL-AR:"+input,
            destroy:()=>{window.__aiDestroyed++;}};
   }
  };
 });
 await a.locator("#copilotTranslate").click();
 await a.waitForFunction(()=>
  document.querySelector("#copilotTranslationResult").textContent==="LOCAL-AR:Hello");
 assert.equal(await a.evaluate(()=>window.__aiCreated),1);
 assert.equal(await a.evaluate(()=>window.__aiDestroyed),1,
  "Local translator must be destroyed after one-shot use");
 await a.locator("#copilotTranslationUse").click();
 assert.equal(await a.locator("#sendText").inputValue(),"LOCAL-AR:Hello");
 console.log("OPTIONAL_BROWSER_AI_LOCAL_ONLY_NO_MODEL_DOWNLOAD_OR_REMOTE_FALLBACK: PASS");

 await a.evaluate(()=>{window.SpeechRecognition=undefined;});
 await a.locator("#copilotCaptionToggle").click();
 assert.match(await a.locator("#copilotCaptionStatus").innerText(),/دستیاب نہیں/);
 await a.evaluate(()=>{
  window.__remoteASR=0;
  window.SpeechRecognition=class{
   constructor(){this.processLocally=false;}
   static async available(){return "downloadable";}
   start(){window.__remoteASR++;}
  };
 });
 await a.locator("#copilotCaptionToggle").click();
 assert.equal(await a.evaluate(()=>window.__remoteASR),0,
  "No cloud ASR fallback even when local model isn't present");
 assert.match(await a.locator("#copilotCaptionStatus").innerText(),/پیک|pack/);
 await a.evaluate(()=>{
  window.__localASR=0;window.__localFlag=false;
  window.SpeechRecognition=class{
   constructor(){this.processLocally=false;}
   static async available(options){
    if(!options.processLocally)throw Error("Cloud speech is forbidden");
    return "available";
   }
   start(){
    window.__localASR++;
    window.__localFlag=this.processLocally===true;
    if(!window.__localFlag)throw Error("Cloud speech is forbidden");
    queueMicrotask(()=>{
     this.onresult?.({results:[[{transcript:"PRIVATE LOCAL CAPTION"}]]});
     this.onend?.();
    });
   }
   abort(){}
  };
 });
 await a.locator("#copilotCaptionToggle").click();
 await a.waitForFunction(()=>
  document.querySelector("#copilotCaptionResult")?.textContent==="PRIVATE LOCAL CAPTION");
 assert.equal(await a.evaluate(()=>window.__localASR),1);
 assert.equal(await a.evaluate(()=>window.__localFlag),true);
 assert.equal(await a.evaluate(()=>window.__privacyMicCalls),0,
  "Mock local ASR does not create background getUserMedia");
 await a.locator("#copilotClear").click();
 assert.equal(await a.locator("#sendText").inputValue(),"");
 assert.equal(await a.locator("#copilotTranslationResult").innerText(),"");
 assert.equal(await a.locator("#copilotCaptionResult").innerText(),"");
 console.log("LOCAL_CAPTION_EXPLICIT_CLICK_NO_CLOUD_AND_EPHEMERAL_PURGE: PASS");

 await a.locator("#language").selectOption("en");
 assert.match(await a.locator("#copilotTitle").innerText(),/Privacy Copilot/);
 await a.locator("#language").selectOption("ar");
 assert.match(await a.locator("#copilotTitle").innerText(),/مساعد AI/);
 assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,
  "Mobile copilot must not cause horizontal scrolling");
 console.log("URDU_ENGLISH_ARABIC_MOBILE_LAYOUT_AND_PRIVACY: PASS");
}finally{
 for(const ctx of contexts)await ctx.close().catch(()=>{});
 await browser.close();
}
