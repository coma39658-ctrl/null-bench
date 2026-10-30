(function () {
  "use strict";

  function installMock() {
    const get = id => document.getElementById(id);
    const button = get("ezeroVoiceGuideImageSend");
    const gallery = get("ezeroVoiceGuideImageInput");
    const camera = get("ezeroVoiceGuideCameraInput");
    const question = get("ezeroVoiceGuideInput");
    const answer = get("ezeroVoiceGuideAnswer");
    const status = get("ezeroVoiceGuideImageStatus");

    const payloadApi = window.EZERO_VISION_PAYLOAD_CANDIDATE_V0_1;
    const transportApi = window.EZERO_QWEN_VISION_TRANSPORT_CANDIDATE_V0_1;

    if (!button || !gallery || !camera || !question ||
        !answer || !status || !payloadApi || !transportApi)
      throw new Error("VISION_BRIDGE_DEPENDENCY_MISSING");

    let busy = false;

    async function mockClick() {
      if (busy || button.disabled) return;

      const file = (gallery.files && gallery.files[0]) ||
                   (camera.files && camera.files[0]);

      if (!file) return;

      busy = true;
      button.disabled = true;

      try {
        const payload = await payloadApi.prepare(
          file,
          question.value.trim() || "اس تصویر کی وضاحت کریں",
          true
        );

        const result = await transportApi.send(payload, {
          userInitiated: true,
          stagingEnabled: true,
          endpoint: "https://ezero-qwen-vision-gateway-public.coma39658.workers.dev/api/ezero-agent/v0.1/ask",
          fetchImpl: async function () {
            return {
              ok: true,
              json: async function () {
                return {
                  status: "OK",
                  source_class: "MOCK_ONLY",
                  answer: "یہ صرف مصنوعی تصویری آزمائش کا جواب ہے۔"
                };
              }
            };
          }
        });

        answer.textContent = result.answer;
        status.textContent =
          "مقامی آزمائش کامیاب۔ تصویر انٹرنیٹ پر نہیں بھیجی گئی۔";
      } catch (error) {
        status.textContent =
          "مقامی تصویری آزمائش ناکام: " + error.message;
      } finally {
        busy = false;
        button.disabled = false;
      }
    }

    const previewApi = window.EZERO_LOCAL_IMAGE_PREVIEW_V0_1;
    if (previewApi &&
        typeof previewApi.setMockClickHandler === "function") {
      previewApi.setMockClickHandler(mockClick);
    } else {
      button.addEventListener("click", mockClick);
    }
  }

  window.EZERO_VISION_LOCAL_BRIDGE_CANDIDATE_V0_1 =
    Object.freeze({ installMock });
})();
