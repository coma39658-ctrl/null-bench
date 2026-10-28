(function () {
  "use strict";
  const MAX_BYTES = 5 * 1024 * 1024;
  let currentUrl = null;

  function initialize() {
    const input = document.getElementById("ezeroVoiceGuideImageInput");
    const preview = document.getElementById("ezeroVoiceGuideImagePreview");
    const status = document.getElementById("ezeroVoiceGuideImageStatus");
    if (!input || !preview || !status) return;

    input.addEventListener("change", function () {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = null;
      preview.hidden = true;
      preview.removeAttribute("src");

      const file = input.files && input.files[0];
      if (!file) {
        status.textContent = "کوئی تصویر منتخب نہیں ہوئی۔";
        return;
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)
          || file.size > MAX_BYTES) {
        input.value = "";
        status.textContent = "صرف PNG، JPEG یا WEBP تصویر، زیادہ سے زیادہ 5 MB۔";
        return;
      }
      currentUrl = URL.createObjectURL(file);
      preview.src = currentUrl;
      preview.hidden = false;
      status.textContent = "مقامی پیش منظر تیار ہے۔ تصویر AI کو نہیں بھیجی گئی۔";
    });

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
