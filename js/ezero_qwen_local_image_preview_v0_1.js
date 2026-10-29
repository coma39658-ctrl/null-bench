(function () {
  "use strict";
  const MAX_BYTES = 5 * 1024 * 1024;
  let currentUrl = null;

  function initialize() {
    const input = document.getElementById("ezeroVoiceGuideImageInput");
    const camera = document.getElementById("ezeroVoiceGuideCameraInput");
    const preview = document.getElementById("ezeroVoiceGuideImagePreview");
    const status = document.getElementById("ezeroVoiceGuideImageStatus");
    if (!input || !camera || !preview || !status) return;

    function onImageChange(event) {
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
      currentUrl = URL.createObjectURL(file);
      preview.src = currentUrl;
      preview.hidden = false;
      status.textContent = "مقامی پیش منظر تیار ہے۔ تصویر AI کو نہیں بھیجی گئی۔";
    }

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
