
"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const events = {};
let networkCalls = 0;
let imageReads = 0;
let blobNumber = 0;

function makeElement(name, props) {
  return {
    ...props,
    addEventListener(type, fn) {
      const key = name + ":" + type;
      (events[key] ||= []).push(fn);
    }
  };
}

const gallery = makeElement("gallery", {
  files: [], value: ""
});
const camera = makeElement("camera", {
  files: [], value: ""
});
const button = makeElement("button", {
  disabled: true,
  setAttribute(k, v) { this[k] = v; }
});
const preview = {
  hidden: true,
  removeAttribute(k) { delete this[k]; }
};
const status = {textContent:""};
const answer = {textContent:""};
const question = {value:""};

const elements = {
  ezeroVoiceGuideImageInput: gallery,
  ezeroVoiceGuideCameraInput: camera,
  ezeroVoiceGuideImageSend: button,
  ezeroVoiceGuideImagePreview: preview,
  ezeroVoiceGuideImageStatus: status,
  ezeroVoiceGuideAnswer: answer,
  ezeroVoiceGuideInput: question
};

const sample =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aF0AAAAASUVORK5CYII=";

function forbiddenNetwork() {
  networkCalls++;
  throw Error("REAL_NETWORK_FORBIDDEN");
}

class MockFileReader {
  readAsDataURL(file) {
    imageReads++;
    this.result =
      "data:" + file.type + ";base64," + sample;
    this.onload();
  }
}

const context = {
  window: {
    fetch: forbiddenNetwork,
    addEventListener(type, fn) {
      (events["window:" + type] ||= []).push(fn);
    }
  },
  document: {
    readyState: "complete",
    getElementById: id => elements[id]
  },
  FileReader: MockFileReader,
  URL: {
    createObjectURL() {
      return "blob:mock-" + (++blobNumber);
    },
    revokeObjectURL() {}
  },
  fetch: forbiddenNetwork
};

const scripts = [
  "ezero_qwen_vision_payload_candidate_v0_1.js",
  "ezero_qwen_vision_transport_candidate_v0_1.js",
  "ezero_qwen_local_image_preview_v0_1.js",
  "ezero_qwen_vision_local_bridge_candidate_v0_1.js"
];

for (const script of scripts) {
  vm.runInNewContext(
    fs.readFileSync("js/" + script, "utf8"),
    context,
    {filename: script}
  );
}

context.window
  .EZERO_VISION_LOCAL_BRIDGE_CANDIDATE_V0_1
  .installMock();

async function clickButton() {
  await Promise.all(
    (events["button:click"] || [])
      .map(fn => fn({currentTarget:button}))
  );
}

(async () => {
  assert.equal(button.disabled, true);
  assert.equal(networkCalls, 0);
  console.log("INITIAL_NO_UPLOAD: PASS");

  gallery.files = [{
    type:"image/png",
    size:137
  }];

  events["gallery:change"][0]({
    currentTarget:gallery
  });

  assert.equal(preview.hidden, false);
  assert.equal(button.disabled, false);
  console.log("IMAGE_SELECTION: PASS");

  assert.equal(events["button:click"].length, 2);

  await clickButton();

  assert.match(answer.textContent, /مصنوعی/);
  assert.match(status.textContent, /کامیاب/);
  assert.equal(button.disabled, false);
  assert.equal(imageReads, 1);
  console.log("JOINT_MOCK_RESPONSE: PASS");

  gallery.files = [];
  events["gallery:change"][0]({
    currentTarget:gallery
  });

  assert.equal(button.disabled, true);
  await clickButton();
  assert.equal(imageReads, 1);
  console.log("NO_IMAGE_GUARD: PASS");

  assert.equal(networkCalls, 0);
  console.log("REAL_NETWORK_CALLS: 0");
  console.log("JOINT_VISION_MOCK: PASS");
  console.log("PUBLIC_DEPLOYMENT: NOT_PERFORMED");
})().catch(error => {
  console.error("JOINT_TEST_FAILED:", error.message);
  process.exitCode = 1;
});
