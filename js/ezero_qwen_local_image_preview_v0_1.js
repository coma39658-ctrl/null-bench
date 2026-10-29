(function () {
  "use strict";
  const MAX_BYTES = 5 * 1024 * 1024;
  let currentUrl = null;
  let mockClickHandler = null;

  window.EZERO_LOCAL_IMAGE_PREVIEW_V0_1 = Object.freeze({
    setMockClickHandler(handler) {
      if (typeof handler !== "function")
        throw new Error("INVALID_MOCK_CLICK_HANDLER");
      mockClickHandler = handler;
    }
  });

  function initialize() {
    const input = document.getElementById("ezeroVoiceGuideImageInput");
    const camera = document.getElementById("ezeroVoiceGuideCameraInput");
    const preview = document.getElementById("ezeroVoiceGuideImagePreview");
    const status = document.getElementById("ezeroVoiceGuideImageStatus");
    const sendButton = document.getElementById("ezeroVoiceGuideImageSend");
    if (!input || !camera || !preview || !status || !sendButton) return;
    let selectedFile = null;

    function onImageChange(event) {
      selectedFile = null;
      sendButton.disabled = true;
      sendButton.setAttribute("aria-disabled", "true");
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = null;
      preview.hidden = true;
      preview.removeAttribute("src");

      const chosen = event.currentTarget;
      const file = chosen.files && chosen.files[0];
      if (!file) {
        status.textContent = "کوئی تصویر منتخب نہیں ہوئی۔";
        return;
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)
          || file.size > MAX_BYTES) {
        chosen.value = "";
        status.textContent = "صرف PNG، JPEG یا WEBP تصویر، زیادہ سے زیادہ 5 MB۔";
        return;
      }
      (chosen === camera ? input : camera).value = "";
      selectedFile = file;
      currentUrl = URL.createObjectURL(file);
      preview.src = currentUrl;
      preview.hidden = false;
      status.textContent = "تصویر تیار ہے۔ ابھی AI کو نہیں بھیجی گئی۔";
      sendButton.disabled = false;
      sendButton.setAttribute("aria-disabled", "false");
      sendButton.textContent = "تصویر کی اجازت جانچیں (مقامی آزمائش)";
    }

    sendButton.addEventListener("click", function () {
      if (!selectedFile || sendButton.disabled) return;
      if (mockClickHandler) return mockClickHandler();
      status.textContent = "مقامی اجازت کا بٹن دبایا گیا۔ تصویر AI کو نہیں بھیجی گئی۔";
    });
    input.addEventListener("change", onImageChange);
    camera.addEventListener("change", onImageChange);

    window.addEventListener("pagehide", function () {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
