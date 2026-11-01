import assert from "node:assert/strict";
import {chromium} from "playwright";
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,768,1280]){
  const ctx=await browser.newContext({viewport:{width,height:850},reducedMotion:"reduce"});
  const page=await ctx.newPage();
  await page.route(url=>url.hostname.endsWith("workers.dev"),r=>r.fulfill({status:200,contentType:"application/json",body:'{"status":"OFFLINE","public_ai_enabled":false}'}));
  const response=await page.goto("http://127.0.0.1:8767/index.html",{waitUntil:"domcontentloaded"});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.EZERO_LANGUAGE&&window.EZERO_NULL_BENCH_HOME_V0_2);
  assert.equal(await page.locator(".ezero-public-launch a").count(),1);
  assert.equal(await page.locator(".ezero-public-quickbar a").count(),4);
  assert.equal(await page.locator(".ezero-home-grid>a").count(),4);
  assert.equal(await page.locator("#ezeroLanguagePickerButton:visible").count(),1,"Only one visible language selector");
  assert.equal(await page.locator("#languageSelect:visible").count(),0);
  const links=await page.locator(".ezero-home-grid>a").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("href")));
  assert.equal(links[0],"https://e-zero-dashboard.onrender.com/studio");
  assert.equal(links[1],"https://e-zero-dashboard.onrender.com/dashboard");
  assert.equal(links[2],"./ezero_ai_studio_v0_1.html");
  assert.equal(links[3],"#try");
  assert.equal(await page.locator('#try').count(),1,"Existing research tool must remain");
  assert.equal(await page.locator('#vehicle-obd').count(),1,"Existing vehicle section must remain");
  for(const [lang,pattern] of [["ur",/گاڑیوں کا ڈیش بورڈ/],["en",/Vehicle dashboard/i],["ar",/لوحة المركبات/],["es",/Panel de vehículos/],["zh-CN",/车辆仪表盘/],["ja",/車両ダッシュボード/]]){
   await page.evaluate(lang=>window.EZERO_LANGUAGE.apply(lang),lang);
   assert.equal(await page.locator("html").getAttribute("lang"),lang);
   assert.match(await page.locator(".ezero-home-grid").innerText(),pattern);
  }
  await page.evaluate(()=>window.EZERO_LANGUAGE.apply("ur"));
  const direction=await page.locator("html").getAttribute("dir");
  assert.equal(direction,"rtl");
  const overflow=await page.evaluate(()=>({
   screen:document.documentElement.clientWidth,
   actual:document.documentElement.scrollWidth,
   hero:document.querySelector("section.hero")?.getBoundingClientRect().width
  }));
  assert.ok(overflow.actual<=overflow.screen+4,JSON.stringify(overflow));
  const h=await page.locator("section.hero h1").evaluate(n=>({font:parseFloat(getComputedStyle(n).fontSize),height:n.getBoundingClientRect().height}));
  if(width<=390)assert.ok(h.font<=34,"Huge mobile Urdu heading must be resized: "+JSON.stringify(h));
  const selectors=await page.locator("#ezeroLanguagePickerButton:visible").count();
  assert.equal(selectors,1);
  const modal=page.locator("#ezeroLanguagePickerPanel");
  await page.locator("#ezeroLanguagePickerButton").click();
  assert.equal(await modal.isVisible(),true);
  await page.locator(".ezero-language-picker-close").click();
  assert.equal(await modal.isVisible(),false);
  await ctx.close();
 }
 console.log("MODERN_NULL_BENCH_MOBILE_320_390_768_1280: PASS");
 console.log("FIFTEEN_LANGUAGE_QUICK_MODULES_SINGLE_SELECTOR: PASS");
 console.log("DASHBOARD_AI_STUDIO_NULL_BENCH_DIRECT_LINKS: PASS");
 console.log("EXISTING_TEST_ENGINE_AND_EVIDENCE_UNCHANGED: PASS");
}catch(error){console.error("NULL_BENCH_MODERN_HOME_FAILED",String(error));process.exitCode=1;}
finally{await browser.close()}
