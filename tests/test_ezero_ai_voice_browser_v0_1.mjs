import assert from "node:assert/strict";
import {chromium} from "playwright";
const base="http://127.0.0.1:8767";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await context.route("**/*",async route=>{
 const url=route.request().url();
 if(url.startsWith(base+"/"))return route.continue();
 if(url.endsWith("/api/ezero-agent/v0.1/ask"))return route.fulfill({
  status:200,contentType:"application/json",
  body:JSON.stringify({status:"OK",source_class:"GOVERNED_AI",diagnostic_claim:false,evidence_authority:false,answer:"یہ مقامی آزمائشی جواب ہے۔",market_price_verification:"NOT_VERIFIED",web_research_status:"DISABLED",sources:[]})
 });
 if(url.endsWith("/health"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({status:"ONLINE",public_ai_enabled:true,evidence_authority:false})});
 return route.abort("blockedbyclient");
});
const page=await context.newPage();
try{
 await page.goto(base+"/ai.html",{waitUntil:"domcontentloaded"});
 assert.equal(await page.locator("#continueStudio").count(),1);
 assert.equal(await page.locator("#installBtn").count(),1);
 assert.equal(new URL(page.url()).pathname,"/ai.html","No automatic redirect");
 await page.locator("#installBtn").click();
 assert.match(await page.locator("#installHint").innerText(),/Chrome|Install|Home screen|Menu/);
 await page.locator("#continueStudio").click();
 await page.waitForURL(/ezero_ai_studio_v0_1\.html$/);
 await page.locator("#ezeroSaveOptIn").check();
 await page.locator("#prompt").fill("What is a lambda sensor?");
 await page.locator("#send").click();
 await page.locator(".msg.assistant .messageTools").first().waitFor();
 const tools=page.locator(".msg.assistant .messageTools").first();
 assert.match(await tools.innerText(),/متن و لنک شیئر/);
 assert.match(await tools.innerText(),/آڈیو WAV بنائیں/);
 await page.waitForFunction(()=>document.getElementById("ezeroStoredCount")?.textContent.includes("2"));
 assert.match(await page.locator("#ezeroStoredCount").innerText(),/2/);
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelectorAll(".msg.assistant .messageTools").length>=1);
 assert.match(await page.locator(".msg.assistant .bubble").last().innerText(),/آزمائشی جواب/);
 assert.equal(await page.locator("#ezeroSaveOptIn").isChecked(),true);
 // Nothing triggers the microphone when a shared link opens.
 assert.equal(await page.locator("#ezeroFaceTalkBtn").getAttribute("aria-pressed"),"false");
 page.once("dialog",dialog=>dialog.accept());
 await page.locator("#ezeroClearStored").click();
 await page.waitForFunction(()=>document.getElementById("ezeroStoredCount")?.textContent.includes("ابھی کوئی"));
 await page.goto(base+"/index.html",{waitUntil:"domcontentloaded"});
 assert.equal(await page.locator("a.ezero-voice-float").count(),1);
 assert.ok((await page.locator('a[href="./ezero_ai_studio_v0_1.html#voice"]').count())>=2);
 assert.ok((await page.locator('a[href="./ai.html"]').count())>=1);
 await page.locator("a.ezero-voice-float").click();
 await page.waitForURL(/ezero_ai_studio_v0_1\.html#voice$/);
 assert.equal(await page.locator("#ezeroFaceTalkBtn").getAttribute("aria-pressed"),"false");
 console.log("MOBILE_CONSENT_INSTALL_ENTRY: PASS");
 console.log("MOBILE_LOCAL_TRANSCRIPT_SAVE_RESTORE_DELETE: PASS");
 console.log("MOBILE_TEXT_AND_AUDIO_SHARE_CONTROLS: PASS");
 console.log("MOBILE_MAIN_HOME_VOICE_LAUNCHER: PASS");
 console.log("MICROPHONE_NOT_AUTOSTARTED: PASS");
}finally{await context.close();await browser.close();}
