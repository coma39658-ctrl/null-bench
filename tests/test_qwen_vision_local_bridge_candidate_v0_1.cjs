"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

let calls = 0;
let fail = false;
let networkCalls = 0;

const file = {type:"image/png",size:1024};
const button = {
  disabled:false,
  addEventListener(name,fn) {
    if (name === "click") this.click = fn;
  }
};

const gallery = {files:[file]};
const camera = {files:[]};
const question = {value:""};
const answer = {textContent:""};
const status = {textContent:""};

const elements = {
  ezeroVoiceGuideImageSend:button,
  ezeroVoiceGuideImageInput:gallery,
  ezeroVoiceGuideCameraInput:camera,
  ezeroVoiceGuideInput:question,
  ezeroVoiceGuideAnswer:answer,
  ezeroVoiceGuideImageStatus:status
};

const browser = {
  EZERO_VISION_PAYLOAD_CANDIDATE_V0_1:{
    prepare:async (f,q,consent)=>{
      assert.equal(f,file);
      assert.equal(q,"اس تصویر کی وضاحت کریں");
      assert.equal(consent,true);
      return {
        question:q,
        image_share_consent:true,
        image:{mime_type:"image/png",base64:"abcdefghijklmnop"}
      };
    }
  },
  EZERO_QWEN_VISION_TRANSPORT_CANDIDATE_V0_1:{
    send:async (payload,options)=>{
      calls++;
      assert.equal(payload.image_share_consent,true);
      assert.equal(options.userInitiated,true);
      assert.equal(options.stagingEnabled,true);
      assert.equal(typeof options.fetchImpl,"function");
      if (fail) throw Error("MOCK_FAILURE");
      const response = await options.fetchImpl();
      const data = await response.json();
      assert.equal(data.source_class,"MOCK_ONLY");
      return data;
    }
  },
  fetch:()=>{
    networkCalls++;
    throw Error("NETWORK_FORBIDDEN");
  }
};

vm.runInNewContext(
  fs.readFileSync(
    "js/ezero_qwen_vision_local_bridge_candidate_v0_1.js",
    "utf8"
  ),
  {
    window:browser,
    document:{getElementById:id=>elements[id]}
  }
);

browser.EZERO_VISION_LOCAL_BRIDGE_CANDIDATE_V0_1.installMock();

(async()=>{
  await button.click();
  assert.equal(calls,1);
  assert.match(answer.textContent,/مصنوعی/);
  assert.match(status.textContent,/کامیاب/);
  assert.equal(button.disabled,false);
  console.log("BRIDGE_MOCK_SUCCESS: PASS");

  fail = true;
  await button.click();
  assert.equal(calls,2);
  assert.match(status.textContent,/MOCK_FAILURE/);
  assert.equal(button.disabled,false);
  console.log("BRIDGE_ERROR_HANDLING: PASS");

  gallery.files = [];
  await button.click();
  assert.equal(calls,2);
  console.log("NO_IMAGE_GUARD: PASS");

  assert.equal(networkCalls,0);
  console.log("REAL_NETWORK_CALLS: 0");
  console.log("VISION_LOCAL_BRIDGE_REGRESSION: PASS");
  console.log("PUBLIC_DEPLOYMENT: NOT_PERFORMED");
})().catch(error=>{
  console.error("TEST_FAILED:",error.message);
  process.exitCode=1;
});
