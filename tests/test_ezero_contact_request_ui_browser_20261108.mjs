/* E-ZERO mobile web staging UI: no auto-call, no background WebSockets.
 * Run against localhost:8769, with Playwright chromium, no Cloudflare calls.
 */
import assert from "node:assert/strict";
import {chromium} from "playwright";

const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const base="http://127.0.0.1:8769/ezero_trusted_friends_staging_20261106.html";
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const prep=async()=>{
  await page.addInitScript(()=>{
   window.__referralWssOpens=0;
   const original=window.WebSocket;
   window.WebSocket=class CountingWS extends original{
     constructor(...args){window.__referralWssOpens++;super(...args);}
   };
   window.__referralMediaStarts=0;
   if(navigator.mediaDevices?.getUserMedia){
     const old=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
     navigator.mediaDevices.getUserMedia=(...args)=>{
       window.__referralMediaStarts++;
       return old(...args);
     };
   }
  });
 };
 await prep();
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.waitForTimeout(700);
 assert.equal(await page.locator("#ezeroReferralInboxPilot").count(),0,
   "Ordinary call page must not acquire contact-request controls");
 assert.equal(await page.evaluate(()=>window.__referralWssOpens),0);
 console.log("NO_OPT_IN_ORDINARY_CALL_PAGE_UNCHANGED: PASS");

 await page.goto(base+"?contactStage=1",{waitUntil:"domcontentloaded"});
 await page.locator("#ezeroReferralInboxPilot").waitFor({state:"visible",timeout:15000});
 assert.equal(await page.locator("#ezeroReferralListen").count(),1);
 assert.equal(await page.locator("#ezeroReferralSend").count(),1);
 const before=await page.evaluate(()=>({
  socket:window.__referralWssOpens,media:window.__referralMediaStarts,
  disabled:window.EZERO_REFERRAL_INBOX_STAGE_CONFIG?.enabled,
  ownerPanel:!!document.getElementById("ezeroForwardContactStage")
 }));
 assert.equal(before.socket,0);
 assert.equal(before.media,0);
 assert.equal(before.disabled,false);
 assert.equal(before.ownerPanel,true);
 console.log("ISOLATED_REFERRAL_CONTROLS_VISIBLE_BUT_NETWORK_DISABLED: PASS");

 await page.locator("#ezeroReferralListen").click();
 await page.locator("#ezeroReferralSend").click();
 const result=await page.evaluate(()=>({
  status:document.getElementById("ezeroReferralStatus")?.dataset.code,
  ws:window.__referralWssOpens,media:window.__referralMediaStarts,
  autoTrust:localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")
 }));
 assert.equal(result.status,"off");
 assert.equal(result.ws,0);
 assert.equal(result.media,0);
 assert.equal(result.autoTrust,null);
 console.log("INERT_DISABLED_REQUEST_BUTTONS_DO_NOT_FAKE_SUCCESS_OR_ACCESS_CAMERA: PASS");

 await page.goto(base+"#contact=invalid",{waitUntil:"domcontentloaded"});
 await page.locator("#ezeroReferralInboxPilot").waitFor({state:"visible",timeout:15000});
 await page.waitForTimeout(400);
 assert.equal(await page.locator("#ezeroForwardIncoming").isHidden(),true);
 assert.equal(await page.evaluate(()=>window.__referralWssOpens),0);
 console.log("INVALID_FORWARDED_LINK_NEVER_AUTOTRUSTS_OR_CONTACTS_SERVER: PASS");
 console.log("E_ZERO_THIRD_PARTY_REQUEST_MOBILE_STAGING_UI: PASS");
}finally{await browser.close();}
