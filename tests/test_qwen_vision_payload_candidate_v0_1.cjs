const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const sample = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aF0AAAAASUVORK5CYII=";
let uploads = 0;

class MockFileReader {
  readAsDataURL(file) {
    if (file.readError) {
      this.onerror();
      return;
    }
    this.result = (file.invalidData ? "data:text/plain;base64," :
      "data:" + file.type + ";base64,") + sample;
    this.onload();
  }
}

const context = {
  window: {},
  FileReader: MockFileReader,
  fetch() {
    uploads++;
    throw Error("NETWORK_FORBIDDEN");
  }
};

vm.runInNewContext(
  fs.readFileSync("js/ezero_qwen_vision_payload_candidate_v0_1.js", "utf8"),
  context
);

const prepare = context.window.EZERO_VISION_PAYLOAD_CANDIDATE_V0_1.prepare;
const image = {type:"image/png",size:137};

(async () => {
  await assert.rejects(prepare(image,"Explain",false),/IMAGE_CONSENT_REQUIRED/);
  console.log("CONSENT_GUARD: PASS");

  await assert.rejects(prepare({type:"text/plain",size:100},"Explain",true),/INVALID_IMAGE/);
  await assert.rejects(prepare({type:"image/png",size:5242881},"Explain",true),/INVALID_IMAGE/);
  console.log("FILE_VALIDATION: PASS");

  await assert.rejects(prepare(image,"",true),/INVALID_QUESTION/);
  console.log("QUESTION_VALIDATION: PASS");

  await assert.rejects(prepare({...image,invalidData:true},"Explain",true),/INVALID_IMAGE_DATA/);
  await assert.rejects(prepare({...image,readError:true},"Explain",true),/IMAGE_READ_FAILED/);
  console.log("IMAGE_READ_ERRORS: PASS");

  const payload = await prepare(image,"تصویر سمجھائیں",true);
  assert.equal(payload.image.mime_type,"image/png");
  assert.equal(payload.image.base64,sample);
  assert.equal(payload.image_share_consent,true);
  console.log("PAYLOAD_FORMAT: PASS");

  assert.equal(uploads,0);
  console.log("NETWORK_UPLOADS: 0");
  console.log("VISION_PAYLOAD_REGRESSION: PASS");
  console.log("PUBLIC_DEPLOYMENT: NOT_PERFORMED");
})().catch(error => {
  console.error("TEST_FAILED:",error.message);
  process.exitCode = 1;
});
