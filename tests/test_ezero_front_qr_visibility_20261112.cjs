"use strict";
/* Static QR visibility regression guard for the isolated staging branch.
 * No camera, network, private data, or production modification.
 * This test does NOT establish real two-phone success. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const hub=fs.readFileSync("js/ezero_front_qr_hub_v0_1.js","utf8");
const page=fs.readFileSync("ezero_trusted_friends_staging_20261106.html","utf8");
function contains(needle,label){assert.ok(hub.includes(needle),label);console.log(label+": PASS");}
contains('own.addEventListener("click",()=>start("audio"))',"MY_QR_HAS_EXPLICIT_BUTTON");
contains('video.addEventListener("click",()=>start("video"))',"VIDEO_QR_HAS_SEPARATE_BUTTON");
contains('placeQr(kind==="video"?"video":"own")',"QR_PLACED_BESIDE_PRESSED_CONTROL");
contains('const visible=!qrBox.hidden && !!qrBox.querySelector("svg")',"QR_READY_REQUIRES_RENDERED_SVG");
contains('imageShare.disabled=!visible',"QR_IMAGE_SHARE_DISABLED_UNTIL_RENDER");
contains('if(!visible){setStatus("notReady");return;}',"QR_NO_FALSE_READY_MESSAGE");
contains('scannerStop.addEventListener("click",()=>scannerSlot.classList.remove("ezero-scanner-active"))',"SCANNER_STOP_CLOSES_TILE");
contains('scannerObserver.observe(scannerVideo,{attributes:true,attributeFilter:["hidden"]})',"SCANNER_HIDDEN_STATE_SYNC");
assert.ok(page.includes('id="ezeroOneQrBox"'),"Authoritative QR container exists");
assert.ok(page.includes('id="ezeroOneStopScan"'),"Scanner stop control exists");
assert.ok(!/new RTCPeerConnection|navigator.mediaDevices\.getUserMedia/.test(hub),"QR hub does not replace WebRTC/media engine");
console.log("QR_STAGING_STATIC_REGRESSION: PASS; REAL_DEVICE: NOT_TESTED");
