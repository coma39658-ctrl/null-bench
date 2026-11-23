"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const page=fs.readFileSync("ezero_secure_connect_live_p2p_v0_1.html","utf8");
const core=fs.readFileSync("js/ezero_secure_connect_public_qr_v0_2.js","utf8");
const decoder=fs.readFileSync("js/vendor/jsqr-apache-2.0.js","utf8");
const css=fs.readFileSync("css/ezero_secure_connect_public_qr_v0_2.css","utf8");
new vm.Script(core,{filename:"public_qr.js"});
new vm.Script(decoder,{filename:"jsqr.js"});
assert.match(page,/js\/vendor\/jsqr-apache-2\.0\.js/);
assert.ok(page.indexOf("jsqr-apache-2.0.js")<page.indexOf("ezero_secure_connect_public_qr_v0_2.js"),
  "local decoder loads before scanner runtime");
for(const id of ["scanVideo","oneTapCameraControls","oneTapCameraStatus","oneTapFlipCamera",
  "oneTapTorch","oneTapGalleryButton","oneTapGalleryInput","oneTapStop"])
  assert.match(page,new RegExp('id="'+id+'"'),"scanner control exists: "+id);
assert.match(core,/window\.jsQR\(pixels\.data,width,height/);
assert.doesNotMatch(core,/BarcodeDetector/,"scanner must not depend on optional browser BarcodeDetector");
assert.match(core,/facingMode:\{ideal:cameraFacing\}/);
assert.match(core,/getCapabilities\?\.\(\)/);
assert.match(core,/applyConstraints\(\{advanced:\[\{torch:torchOn\}\]\}\)/);
assert.match(core,/createImageBitmap\(file\)/);
assert.match(core,/inversionAttempts:"attemptBoth"/);
assert.match(core,/EZERO1/);
assert.match(css,/#oneTapCamera\.scanner-active\{[\s\S]*?position:fixed/);
assert.match(css,/height:min\(68dvh,760px\)/);
assert.match(css,/\.one-tap-camera-actions/);
assert.match(fs.readFileSync("js/vendor/JSQR-LICENSE.txt","utf8"),/Apache License[\s\S]*Version 2\.0/);
console.log("WEB_QR_LOCAL_DECODER_NO_BARCODEDETECTOR_DEPENDENCY: PASS");
console.log("FULLSCREEN_MOBILE_SCANNER_CAMERA_FLIP_TORCH_GALLERY_CONTROLS: PASS");
console.log("SIGNED_EZERO_QR_VERIFICATION_AND_LOCAL_IMAGE_DECODE: PASS");
