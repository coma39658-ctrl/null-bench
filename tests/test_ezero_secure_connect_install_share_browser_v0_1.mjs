import assert from "node:assert/strict";
import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const root="http://127.0.0.1:8769/ezero_secure_connect_live_p2p_v0_1.html";
const contexts=[];
try {
  const c=await browser.newContext({
    viewport:{width:393,height:852},isMobile:true,hasTouch:true,
    userAgent:"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36"
  });
  contexts.push(c);
  await c.route("**/*",route=>route.request().url().startsWith("http://127.0.0.1:8769/")?
    route.continue():route.abort("blockedbyclient"));
  const page=await c.newPage();
  page.on("pageerror",error=>console.log("PWA_PAGEERROR",String(error).slice(0,240)));
  await page.goto(root,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#myFingerprint").textContent.length===64);
  assert.equal(await page.locator("#shareConnectLink").isVisible(),true);
  assert.equal(await page.locator("#copyConnectLink").isVisible(),true);
  assert.equal(await page.locator("#installSecureConnect").isVisible(),true);
  const manifest=await page.evaluate(async()=>await (await fetch("./secure-connect.webmanifest")).json());
  assert.equal(manifest.short_name,"E-ZERO Connect");
  assert.equal(manifest.display,"standalone");
  const sharedURL=await page.locator("#publicConnectLink").getAttribute("href");
  assert.match(sharedURL,/ezero_secure_connect_live_p2p_v0_1\.html$/);
  assert.ok(!sharedURL.includes("EZERO1.")&&!sharedURL.includes("fingerprint"));
  assert.equal(await page.evaluate(()=>document.querySelector("#installHelp").hidden),true);
  console.log("PUBLIC_LINK_AND_VISIBLE_INSTALL_BUTTON_ON_FIRST_VISIT: PASS");

  await page.evaluate(()=>{
    window.__sharePayload=null;
    Object.defineProperty(navigator,"share",{
      configurable:true,value:async payload=>{window.__sharePayload=payload;}
    });
  });
  await page.locator("#shareConnectLink").click();
  const payload=await page.evaluate(()=>window.__sharePayload);
  assert.equal(payload.title,"E-ZERO Secure Connect");
  assert.equal(payload.url,sharedURL);
  assert.equal(Object.keys(payload).sort().join(","),"text,title,url");
  assert.ok(!JSON.stringify(payload).includes("EZERO1.")&&!JSON.stringify(payload).includes("SHA256:"));
  assert.match(await page.locator("#shareInstallStatus").innerText(),/شیئرنگ کا عمل مکمل/);
  console.log("MESSAGING_APP_SHARE_SENDS_ONLY_PUBLIC_URL_NO_PERSONAL_ID: PASS");

  // Without the browser's install event, never pretend installation succeeded.
  await page.locator("#installSecureConnect").click();
  assert.equal(await page.locator("#installHelp").isVisible(),true);
  assert.match(await page.locator("#installHelpText").innerText(),/Chrome/);
  assert.match(await page.locator("#shareInstallStatus").innerText(),/دستیاب نہیں/);
  assert.equal(await page.locator("#installSecureConnect").isEnabled(),true);
  console.log("WHATSAPP_IMO_IN_APP_BROWSER_INSTALL_FALLBACK: PASS");

  await page.evaluate(()=>{
    window.__promptCount=0;
    const e=new Event("beforeinstallprompt",{cancelable:true});
    e.prompt=()=>{window.__promptCount++;};
    e.userChoice=Promise.resolve({outcome:"accepted"});
    window.dispatchEvent(e);
    window.__prevented=e.defaultPrevented;
  });
  assert.equal(await page.evaluate(()=>window.__prevented),true);
  assert.equal(await page.evaluate(()=>window.__promptCount),0,"Install prompt is not automatic");
  await page.locator("#installSecureConnect").click();
  assert.equal(await page.evaluate(()=>window.__promptCount),1,"Install prompt requires user gesture");
  await page.waitForFunction(()=>document.querySelector("#shareInstallStatus").dataset.state==="accepted");
  assert.equal(await page.locator("#installSecureConnect").isEnabled(),true,
    "Accepted request is not treated as installed until browser confirms it");
  await page.evaluate(()=>window.dispatchEvent(new Event("appinstalled")));
  await page.waitForFunction(()=>document.querySelector("#shareInstallStatus").dataset.state==="installed");
  assert.equal(await page.locator("#installSecureConnect").isDisabled(),true);
  console.log("USER_TAP_BROWSER_PERMISSION_INSTALL_CONFIRMATION_NOT_FAKED: PASS");

  await page.locator("#language").selectOption("en");
  assert.match(await page.locator("#shareInstallTitle").innerText(),/Share E-ZERO/);
  assert.match(await page.locator("#shareConnectLink").innerText(),/Send link/);
  await page.locator("#language").selectOption("ar");
  assert.match(await page.locator("#shareInstallTitle").innerText(),/مشاركة/);
  assert.match(await page.locator("#shareConnectLink").innerText(),/إرسال الرابط/);
  await page.locator("#language").selectOption("ur");
  assert.match(await page.locator("#shareInstallTitle").innerText(),/دوستوں کو بھیجیں/);
  console.log("PWA_SHARE_INSTALL_CONTROLS_THREE_LANGUAGES: PASS");

  const iosContext=await browser.newContext({
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1"
  });
  contexts.push(iosContext);
  const iosPage=await iosContext.newPage();
  await iosPage.goto(root,{waitUntil:"domcontentloaded"});
  await iosPage.locator("#installSecureConnect").click();
  assert.match(await iosPage.locator("#installHelpText").innerText(),/Safari|Share/);
  assert.equal(await iosPage.locator("#installSecureConnect").isEnabled(),true);
  console.log("IOS_NO_FALSE_NATIVE_INSTALL_PROMPT: PASS");
} finally {
  for(const c of contexts)await c.close().catch(()=>{});
  await browser.close();
}