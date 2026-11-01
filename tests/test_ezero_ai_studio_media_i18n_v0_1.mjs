import assert from "node:assert/strict";
import {chromium} from "playwright";
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:780}});
  const page=await ctx.newPage();
  const errors=[],external=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route(/workers\.dev\//,async route=>{external.push(route.request().url());await route.fulfill({status:200,contentType:"application/json",body:'{"status":"OFFLINE","public_ai_enabled":false}'});});
  const r=await page.goto("http://127.0.0.1:8767/ezero_ai_studio_v0_1.html",{waitUntil:"networkidle"});
  assert.equal(r.status(),200);
  assert.equal(await page.locator("#aiVideoPanel").isVisible(),false);
  assert.equal(await page.locator("#quickVideo").count(),1);
  assert.equal(await page.locator("#aiStudioBack").count(),1);
  assert.equal(await page.locator("#aiUILanguage option").count(),15);
  assert.equal(await page.locator("#aiUIMobileLanguage option").count(),15);
  assert.equal(await page.evaluate(()=>window.EZERO_AI_STUDIO_MEDIA_V0_1?.video_ai_enabled),false);
  const localeSelect=width>830?"#aiUILanguage":"#aiUIMobileLanguage";
  for(const [locale,phrase,dir] of [["ur","سوچیں","rtl"],["ar","فكّر","rtl"],["hi","सोचें","ltr"],["en","Think","ltr"],["zh-CN","思考","ltr"],["es","Piensa","ltr"],["fr","Réfléchir","ltr"],["ko","생각하고","ltr"]]){
   await page.locator(localeSelect).selectOption(locale);
   assert.equal(await page.locator("html").getAttribute("lang"),locale);
   assert.equal(await page.locator("html").getAttribute("dir"),dir);
   assert.match(await page.locator("#welcome h1").innerText(),new RegExp(phrase));
   assert.equal(await page.locator("#aiUILanguage").inputValue(),locale);
  }
  await page.locator(localeSelect).selectOption("en");
  await page.locator("#quickVideo").click();
  assert.equal(await page.locator("#aiVideoPanel").isVisible(),true);
  assert.match(await page.locator("#aiVideoBoundary").innerText(),/not uploaded/);
  assert.equal(await page.locator("#aiVideoClose").evaluate(el=>el===document.activeElement),true);
  await page.locator("#aiVideoInput").setInputFiles({name:"bad.txt",mimeType:"text/plain",buffer:Buffer.from("test")});
  assert.match(await page.locator("#aiVideoStatus").innerText(),/Unsupported video type/);
  await page.locator("#aiVideoInput").setInputFiles({name:"clip.mp4",mimeType:"video/mp4",buffer:Buffer.from("not-real-video-data")});
  assert.match(await page.locator("#aiVideoPreview").getAttribute("src"),/^blob:/);
  assert.match(await page.locator("#aiVideoStatus").innerText(),/not uploaded/);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#aiVideoPanel").isVisible(),false);
  assert.equal(await page.locator("#aiVideoPreview").getAttribute("src"),null);
  await page.locator("#aiVideoBtn").click();
  assert.equal(await page.locator("#aiVideoPanel").isVisible(),true);
  await page.locator("#aiVideoClose").click();
  assert.equal(await page.locator("#aiVideoPanel").isVisible(),false);
  // Main back button is outside modal and available after the video is closed.
  assert.equal(await page.locator("#lang option").count(),5,"The governed text AI reply selector remains auto + four languages");
  assert.equal(await page.locator("#file").getAttribute("accept"),"image/png,image/jpeg,image/webp");
  assert.equal(external.filter(x=>x.includes("/api/")).length,0,"No video upload or AI request should occur");
  assert.deepEqual(errors,[],"Browser page must be error-free");
  await page.route("https://e-zero-dashboard.onrender.com/**",route=>route.fulfill({status:200,contentType:"text/html",body:"<h1>E-ZERO Intelligence Studio</h1>"}));
  await page.locator("#aiStudioBack").click();
  await page.waitForURL("https://e-zero-dashboard.onrender.com/");
  await ctx.close();
 }
 console.log("AI_STUDIO_15_UI_LANGUAGES_AND_BACK: PASS");
 console.log("AI_STUDIO_LOCAL_VIDEO_ONLY_NO_UPLOAD: PASS");
 console.log("AI_GATEWAY_FOUR_REPLY_LANGUAGES_UNCHANGED: PASS");
 console.log("AI_STUDIO_MOBILE_DESKTOP_AND_EXIT: PASS");
}catch(e){console.error("AI_STUDIO_MEDIA_BROWSER_FAILED:",String(e));process.exitCode=1;}
finally{await browser.close()}
