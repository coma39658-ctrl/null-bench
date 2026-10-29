(function () {
  "use strict";

  const ENDPOINT =
    "https://ezero-qwen-gateway-staging.coma39658.workers.dev/api/ezero-agent/v0.1/ask";

  let installed = false;

  function install() {
    if (installed) return;

    const get = id => document.getElementById(id);
    const button = get("ezeroVoiceGuideImageSend");
    const gallery = get("ezeroVoiceGuideImageInput");
    const camera = get("ezeroVoiceGuideCameraInput");
    const question = get("ezeroVoiceGuideInput");
    const answer = get("ezeroVoiceGuideAnswer");
    const status = get("ezeroVoiceGuideImageStatus");

    const preview = window.EZERO_LOCAL_IMAGE_PREVIEW_V0_1;
    const payload = window.EZERO_VISION_PAYLOAD_CANDIDATE_V0_1;
    const transport = window.EZERO_QWEN_VISION_TRANSPORT_CANDIDATE_V0_1;

    if (!button || !gallery || !camera || !question ||
        !answer || !status || !preview || !payload || !transport)
      throw Error("VISION_DEPENDENCY_MISSING");

    let busy = false;
    const selected = () => gallery.files[0] || camera.files[0];

    function updateLabel() {
      button.textContent = "اجازت دیں اور تصویر AI سے سمجھائیں";
    }

    gallery.addEventListener("change", updateLabel);
    camera.addEventListener("change", updateLabel);
    updateLabel();

    preview.setMockClickHandler(async function () {
      if (busy || button.disabled) return;

      const file = selected();
      if (!file) return;

      const approved = window.confirm(
        "کیا آپ اس تصویر کو E-ZERO کے AI سرور پر تجزیے کے لیے بھیجنے کی اجازت دیتے ہیں؟"
      );

      if (!approved) {
        status.textContent = "تصویر نہیں بھیجی گئی۔";
        return;
      }

      busy = true;
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");

      try {
        answer.textContent = "";
        status.textContent = "تصویر AI سرور کو بھیجی جا رہی ہے۔";

        const data = await payload.prepare(
          file,
          question.value.trim() || "Describe this image.",
          true
        );

        const languageSelect = get("languageSelect");
        const supportedLanguages = new Set([
          "en", "ar", "ur", "hi", "zh-CN",
          "es", "fr", "pt", "bn", "ru",
          "id", "ja", "de", "tr", "ko"
        ]);

        const selectedLanguage =
          languageSelect &&
          supportedLanguages.has(languageSelect.value)
            ? languageSelect.value
            : "en";

        data.response_language = selectedLanguage;

        const result = await transport.send(data, {
          userInitiated: true,
          stagingEnabled: true,
          endpoint: ENDPOINT
        });

        if (result.source_class !== "GOVERNED_AI")
          throw Error("UNVERIFIED_IMAGE_RESPONSE");

        if (selected() !== file) {
          status.textContent = "تصویر بدل گئی ہے؛ پچھلا جواب نہیں دکھایا گیا۔";
          return;
        }

        answer.textContent = result.answer;
        status.textContent =
          "AI کا جواب موصول ہوا۔ یہ حتمی گاڑی تشخیص نہیں ہے.";

      } catch (error) {
        status.textContent =
          "تصویری درخواست ناکام: " +
          (error && error.message || "UNKNOWN_ERROR");
      } finally {
        busy = false;
        button.disabled = !selected();
        button.setAttribute("aria-disabled", String(button.disabled));
      }
    });

    installed = true;
  }

  window.EZERO_VISION_REAL_BRIDGE_CANDIDATE_V0_1 =
    Object.freeze({install});
})();
