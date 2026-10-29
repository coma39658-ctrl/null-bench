const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

let realCalls = 0;
let mockCalls = 0;

const context = {
  window: {
    fetch() {
      realCalls++;
      throw Error("REAL_NETWORK_FORBIDDEN");
    }
  }
};

vm.runInNewContext(
  fs.readFileSync("js/ezero_qwen_vision_transport_candidate_v0_1.js", "utf8"),
  context
);

const send = context.window.EZERO_QWEN_VISION_TRANSPORT_CANDIDATE_V0_1.send;
const endpoint = "https://ezero-qwen-gateway-staging.coma39658.workers.dev/api/ezero-agent/v0.1/ask";
const payload = {
  question: "Explain this image",
  image: {mime_type:"image/png",base64:"iVBORw0KGgoAAAANSUhEUg=="},
  image_share_consent:true
};

const options = {
  userInitiated:true,
  stagingEnabled:true,
  endpoint,
  fetchImpl:async (url, request) => {
    assert.equal(url,endpoint);
    assert.equal(JSON.parse(request.body).image_share_consent,true);
    mockCalls++;
    return {
      ok:true,
      json:async () => ({status:"OK",answer:"Mock answer"})
    };
  }
};

(async () => {
  await assert.rejects(send(payload,{...options,userInitiated:false}),/USER_ACTION_REQUIRED/);
  await assert.rejects(send(payload,{...options,stagingEnabled:false}),/VISION_STAGING_DISABLED/);
  await assert.rejects(send(payload,{...options,endpoint:"https://example.com"}),/VISION_ENDPOINT_NOT_APPROVED/);
  await assert.rejects(send({...payload,image_share_consent:false},options),/INVALID_VISION_PAYLOAD/);
  console.log("AUTHORIZATION_GUARDS: PASS");

  await assert.rejects(send({...payload,image:{...payload.image,base64:""}},options),/INVALID_VISION_PAYLOAD/);
  await assert.rejects(send({...payload,image:{...payload.image,base64:"A".repeat(6990509)}},options),/INVALID_VISION_PAYLOAD/);
  console.log("IMAGE_DATA_GUARDS: PASS");

  assert.equal((await send(payload,options)).answer,"Mock answer");
  assert.equal(mockCalls,1);
  assert.equal(realCalls,0);
  console.log("MOCK_RESPONSE: PASS");
  console.log("REAL_NETWORK_CALLS: 0");
  console.log("VISION_TRANSPORT_REGRESSION: PASS");
  console.log("PUBLIC_DEPLOYMENT: NOT_PERFORMED");
})().catch(e => {
  console.error("TEST_FAILED:",e.message);
  process.exitCode=1;
});
