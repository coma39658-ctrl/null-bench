(function () {
  "use strict";

  const MAX_BYTES = 5 * 1024 * 1024;
  const TYPES = ["image/png", "image/jpeg", "image/webp"];

  function prepare(file, question, consent) {
    if (consent !== true)
      return Promise.reject(new Error("IMAGE_CONSENT_REQUIRED"));

    if (!file || !TYPES.includes(file.type) ||
        file.size < 1 || file.size > MAX_BYTES)
      return Promise.reject(new Error("INVALID_IMAGE"));

    const q = typeof question === "string" ? question.trim() : "";
    if (!q || q.length > 4000)
      return Promise.reject(new Error("INVALID_QUESTION"));

    return new Promise(function (resolve, reject) {
      const reader = new FileReader();

      reader.onerror = function () {
      const reason = reader.error && reader.error.name ? reader.error.name : "UNKNOWN";
      reject(new Error("IMAGE_READ_FAILED_" + reason));
    };

      reader.onload = function () {
        const data = String(reader.result || "");
        const prefix = "data:" + file.type + ";base64,";
        if (!data.startsWith(prefix))
          return reject(new Error("INVALID_IMAGE_DATA"));

        const base64 = data.slice(prefix.length);
        if (base64.length < 16 || base64.length > 6990508)
          return reject(new Error("INVALID_IMAGE_SIZE"));

        resolve({
          question: q,
          image: { mime_type: file.type, base64: base64 },
          image_share_consent: true,
          response_language: "auto"
        });
      };

      reader.readAsDataURL(file);
    });
  }

  window.EZERO_VISION_PAYLOAD_CANDIDATE_V0_1 =
    Object.freeze({ prepare: prepare });
})();
