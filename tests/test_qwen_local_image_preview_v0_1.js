"use strict";
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const events = {};
const revoked = [];
let created = 0;

const input = {
  files: [],
  value: "",
  addEventListener: (name, fn) => events[name] = fn
};
const preview = {
  hidden: true,
  removeAttribute(key) { delete this[key]; }
};
const status = { textContent: "" };
const elements = {
  ezeroVoiceGuideImageInput: input,
  ezeroVoiceGuideImagePreview: preview,
  ezeroVoiceGuideImageStatus: status
};

vm.runInNewContext(
  fs.readFileSync("js/ezero_qwen_local_image_preview_v0_1.js", "utf8"),
  {
    document: {
      readyState: "complete",
      getElementById: id => elements[id]
    },
    window: {
      addEventListener: (name, fn) => events[name] = fn
    },
    URL: {
      createObjectURL: () => "blob:test-" + (++created),
      revokeObjectURL: url => revoked.push(url)
    },
    fetch: () => { throw Error("UNAUTHORIZED_NETWORK_CALL"); }
  }
);

assert.strictEqual(typeof events.change, "function");

input.files = [{ type: "image/png", size: 1024 }];
events.change();
assert.strictEqual(preview.hidden, false);
assert.strictEqual(preview.src, "blob:test-1");

input.files = [{ type: "application/pdf", size: 1024 }];
events.change();
assert.strictEqual(preview.hidden, true);
assert.strictEqual(input.value, "");
assert(revoked.includes("blob:test-1"));

input.files = [{ type: "image/jpeg", size: 6 * 1024 * 1024 }];
events.change();
assert.strictEqual(preview.hidden, true);

input.files = [{ type: "image/webp", size: 1024 }];
events.change();
assert.strictEqual(preview.hidden, false);
assert.strictEqual(preview.src, "blob:test-2");

events.pagehide();
assert(revoked.includes("blob:test-2"));

console.log("LOCAL_IMAGE_PREVIEW_REGRESSION: PASS");
console.log("TEST_TYPE: MOCK_BROWSER");
console.log("PUBLIC_DEPLOYMENT: NOT_PERFORMED");
