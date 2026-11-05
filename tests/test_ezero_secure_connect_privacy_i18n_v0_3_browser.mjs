import assert from "node:assert/strict";
import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const base="http://127.0.0.1:8769/";
const contexts=[];
async function open(path){
  const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  contexts.push(context);
  await context.route("**/*",route=>route.request().url().startsWith(base)?
    route.continue():route.abort("blockedbyclient"));
  const page=await context.newPage();
  page.on("pageerror",e=>console.error("POLICY_PAGE_ERROR",String(e)));
  await page.goto(base+path,{waitUntil:"domcontentloaded"});
  return page;
}
async function verify(page,lang,heading,footerWord){
  assert.equal(await page.locator("#policyLanguage").inputValue(),lang);
  assert.equal(await page.locator("html").getAttribute("lang"),lang);
  assert.equal(await page.locator("html").getAttribute("dir"),lang==="en"?"ltr":"rtl");
  for(const lang2 of ["ur","ar","en"]){
    const panel=page.locator('[data-policy-lang="'+lang2+'"]');
    assert.equal(await panel.isVisible(),lang2===lang,"Only selected policy visible");
    assert.equal(await panel.getAttribute("aria-hidden"),String(lang2!==lang));
  }
  const active=page.locator('[data-policy-lang="'+lang+'"]');
  assert.match(await active.locator("h1").innerText(),heading);
  assert.equal(await active.locator(".policy-card").count(),8);
  assert.equal(await active.locator("table tr").count(),6,
    "One header row plus five data-handling rows in every language");
  assert.equal(await active.locator("li").count(),9);
  assert.match(await page.locator("#policyFooter").innerText(),footerWord);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,
    "Full policy must fit mobile viewport horizontally");
}
try{
  const direct=await open("ezero_secure_connect_privacy_v0_2.html");
  await verify(direct,"ur",/پرائیویسی اور سیکیورٹی/,/اشتہار نہیں/);
  await direct.locator("#policyLanguage").selectOption("en");
  await verify(direct,"en",/Privacy & Security Policy/,/No ads/);
  assert.match(direct.url(),/\?lang=en/);
  assert.match(await direct.locator("#policyBack").innerText(),/Back to Connect/);
  assert.match(await direct.locator("#policyBrandSubtitle").innerText(),/Privacy & Security/);
  await direct.locator("#policyLanguage").selectOption("ar");
  await verify(direct,"ar",/سياسة الخصوصية والأمان/,/بلا إعلانات/);
  assert.match(direct.url(),/\?lang=ar/);
  assert.match(await direct.locator("#policyBack").innerText(),/العودة إلى الاتصال/);
  await direct.locator("#policyLanguage").selectOption("ur");
  await verify(direct,"ur",/پرائیویسی اور سیکیورٹی/,/اشتہار نہیں/);
  assert.equal(new URL(direct.url()).searchParams.has("lang"),false);
  console.log("ALL_POLICY_SECTIONS_UR_EN_AR_SWITCHED_WITH_MOBILE_RTL_LTR: PASS");

  const fromMain=await open("ezero_secure_connect_live_p2p_v0_1.html");
  await fromMain.locator("#language").selectOption("en");
  assert.match(await fromMain.locator(".privacy-link a").getAttribute("href"),/\?lang=en$/);
  await fromMain.locator(".privacy-link a").click();
  await fromMain.waitForURL(/privacy_v0_2\.html\?lang=en/);
  await verify(fromMain,"en",/Privacy & Security Policy/,/No ads/);
  await fromMain.locator("#policyBack").click();
  await fromMain.waitForURL(/live_p2p_v0_1\.html\?lang=en/);
  assert.equal(await fromMain.locator("#language").inputValue(),"en");
  assert.match(await fromMain.locator("#distanceTitle").innerText(),/Connect with a distant friend/);
  console.log("MAIN_TO_POLICY_TO_MAIN_PRESERVES_ENGLISH: PASS");

  await fromMain.locator("#language").selectOption("ar");
  assert.match(await fromMain.locator(".privacy-link a").getAttribute("href"),/\?lang=ar$/);
  await fromMain.locator(".privacy-link a").click();
  await fromMain.waitForURL(/privacy_v0_2\.html\?lang=ar/);
  await verify(fromMain,"ar",/سياسة الخصوصية والأمان/,/بلا إعلانات/);
  await fromMain.locator("#policyBack").click();
  await fromMain.waitForURL(/live_p2p_v0_1\.html\?lang=ar/);
  assert.equal(await fromMain.locator("#language").inputValue(),"ar");
  console.log("MAIN_TO_POLICY_TO_MAIN_PRESERVES_ARABIC: PASS");
}finally{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  await browser.close();
}
