/* Isolated UI-only regression guards. No browser, network, media, or deployment. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const qr=fs.readFileSync("js/ezero_front_qr_hub_v0_1.js","utf8");
const video=fs.readFileSync("js/ezero_immersive_video_call_v0_1.js","utf8");
const css=fs.readFileSync("css/ezero_immersive_video_call_v0_1.css","utf8");
test("QR dismissal is visible, reversible and leaves scanner alone",()=>{
  assert.match(qr,/closeOwnQr\.id="ezeroFrontCloseQr"/);
  assert.match(qr,/closeOwnQr\.addEventListener\("click",[\s\S]*?qrBox\.hidden=true/);
  assert.match(qr,/qrVisibility\.observe\(qrBox,\{attributes:true,attributeFilter:\["hidden"\]\}\)/);
  assert.match(qr,/closeOwnQr\.hidden=qrBox\.hidden/);
  assert.match(qr,/ezeroFrontAudioQr/);
  assert.match(qr,/ezeroFrontVideoQr/);
});
test("video swap only acts on small tile and resets at idle",()=>{
  assert.match(video,/if\(!isSmall\)return/);
  assert.match(video,/if\(!body\.classList\.contains\("ezero-video-connected"\)\)return/);
  assert.match(video,/localBox\.classList\.toggle\("ezero-swapped-large",!isSwapped\)/);
  assert.match(video,/remoteBox\.classList\.toggle\("ezero-swapped-small",!isSwapped\)/);
  assert.match(video,/e\.detail\?\.stage==="idle"/);
  assert.match(video,/localBox\.classList\.remove\("ezero-swapped-large","ezero-swapped-small"\)/);
});
test("swap CSS beats frozen first/last child rules by specificity",()=>{
  assert.match(css,/body\.communication-page\.ezero-one-lab\.ezero-video-connected #ezeroCallMediaSlot \.videoBox:first-child/);
  assert.match(css,/body\.communication-page\.ezero-one-lab\.ezero-video-connected #ezeroCallMediaSlot \.videoBox:last-child/);
  const prefix="body.communication-page.ezero-one-lab.ezero-video-connected #ezeroCallMediaSlot .videoBox.ezero-swapped-";
  assert.equal(video.split(prefix).length-1,4);
  assert.doesNotMatch(video,/body\.ezero-video-connected #ezeroCallMediaSlot \.videoBox\.ezero-swapped-/);
});
