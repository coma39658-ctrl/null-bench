import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox",
  "--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]});
const ctx=await browser.newContext({viewport:{width:393,height:852},isMobile:true,
  hasTouch:true,acceptDownloads:true});
try{
 const page=await ctx.newPage(),unexpected=[];
 page.on("pageerror",e=>unexpected.push(e.message));
 page.on("request",r=>{if(!["GET","HEAD"].includes(r.method()))unexpected.push(
   "UNEXPECTED_NETWORK_WRITE_"+r.method()+"_"+r.url().slice(0,100));});
 await page.goto("http://127.0.0.1:8769/ezero_trusted_friends_staging_20261106.html",
   {waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>!!window.EZERO_EVIDENCE_V1,{timeout:15000});
 assert.equal(await page.locator("#ezeroVoiceEvidencePanel").isHidden(),true);
 await page.locator('[data-modern-select="voice"]').click();
 await page.evaluate(()=>{
   const sample=btoa(String.fromCharCode(...new Uint8Array(128).fill(13)));
   document.dispatchEvent(new CustomEvent("ezero:voice-note-received",{
     detail:{mime:"audio/webm",audio:sample}}));
 });
 await page.locator("#ezeroVoiceEvidencePanel").waitFor({state:"visible",timeout:10000});
 assert.equal(await page.locator("#ezeroVoiceProofSave").isDisabled(),true,
   "Received voice cannot auto-download without explicit user consent");
 assert.equal(await page.locator("#ezeroVoiceProofConsent").isChecked(),false);
 await page.locator("#ezeroVoiceProofConsent").check();
 assert.equal(await page.locator("#ezeroVoiceProofSave").isEnabled(),true);
 await page.locator("#ezeroVoiceProofSave").click();
 await page.locator("#ezeroVoiceProofReadyLink").waitFor({state:"visible",timeout:15000});
 const downloadReady=page.waitForEvent("download",{timeout:15000});
 await page.locator("#ezeroVoiceProofReadyLink").click();
 const downloaded=await downloadReady;
 assert.match(downloaded.suggestedFilename(),/\.ezero-proof\.zip$/);
 const data=new Uint8Array(await fs.readFile(await downloaded.path()));
 const checked=await page.evaluate(async input=>
   window.EZERO_EVIDENCE_V1.verifyArchive(
     new Blob([Uint8Array.from(input)],{type:"application/zip"})),
   Array.from(data));
 assert.equal(checked.ok,true,JSON.stringify(checked));
 assert.equal(checked.legalAdmissibility,"NOT_DETERMINED");
 assert.ok(Buffer.from(data).includes("CLAIMED_EZERO_RECEIVED_VOICE_NOTE_UNATTESTED"));
 assert.equal(await page.evaluate(()=>localStorage.getItem(
   "ezero_secure_connect_local_fingerprints_v0_1")),null,
   "Ephemeral proof must not access public saved contacts");
 await page.evaluate(()=>window.dispatchEvent(new Event("pagehide")));
 assert.equal(await page.locator("#ezeroVoiceEvidencePanel").isHidden(),true,
   "Leaving page removes transient references");
 assert.ok(!unexpected.some(x=>x.startsWith("UNEXPECTED_NETWORK_WRITE")),
   "Proof creation must never upload media");
 assert.equal(unexpected.length,0,"Page JavaScript error: "+unexpected.join(" ; "));
 console.log("PASS: received transient voice note offers evidence only with explicit consent");
 console.log("PASS: saved ZIP contains exact media and self-signed SHA-256 proof");
 console.log("PASS: offline verification works; provenance and judicial status qualified");
 console.log("PASS: page exit clears transient evidence; no media POST/network write");
}finally{await ctx.close();await browser.close();}
