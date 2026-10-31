(function () {
  "use strict";

  const STAGING_URL =
    "https://ezero-qwen-vision-gateway-public.coma39658.workers.dev/api/ezero-agent/v0.1/ask";

  async function send(payload, options) {
    const config = options || {};

    if (config.userInitiated !== true)
      throw new Error("USER_ACTION_REQUIRED");

    if (config.stagingEnabled !== true)
      throw new Error("VISION_STAGING_DISABLED");

    if (config.endpoint !== STAGING_URL)
      throw new Error("VISION_ENDPOINT_NOT_APPROVED");

    if (!payload ||
        payload.image_share_consent !== true ||
        typeof payload.question !== "string" ||
        !payload.question.trim() ||
        !payload.image ||
        !["image/png", "image/jpeg", "image/webp"].includes(payload.image.mime_type) ||
        typeof payload.image.base64 !== "string" ||
        payload.image.base64.length < 16 ||
        payload.image.base64.length > 6990508)
      throw new Error("INVALID_VISION_PAYLOAD");

    const body = {
      question: payload.question,
      image: {
        mime_type: payload.image.mime_type,
        base64: payload.image.base64
      },
      image_share_consent: true,
      response_language: payload.response_language || "auto"
    };

    const requestFetch = config.fetchImpl || window.fetch.bind(window);

    const controller =
      typeof window.AbortController === "function"
        ? new window.AbortController() : null;
    const timer =
      controller && typeof window.setTimeout === "function"
        ? window.setTimeout(() => controller.abort(), 30000)
        : null;

    try {
    const response = await requestFetch(STAGING_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      body: JSON.stringify(body),
      ...(controller ? {signal: controller.signal} : {})
    });

    if (!response.ok)
      throw new Error("VISION_GATEWAY_HTTP_" + response.status);

    const data = await response.json();

    if (data.status !== "OK" ||
        typeof data.answer !== "string" ||
        !data.answer.trim())
      throw new Error("VISION_RESPONSE_NOT_VERIFIED");

    return Object.freeze({
      status: "OK",
      answer: data.answer.trim(),
      source_class: data.source_class || "UNKNOWN",
      diagnostic_claim: false
    });
    } catch (error) {
      if (controller && controller.signal.aborted)
        throw new Error("VISION_REQUEST_TIMEOUT");
      throw error;
    } finally {
      if (timer !== null &&
          typeof window.clearTimeout === "function")
        window.clearTimeout(timer);
    }
  }

  window.EZERO_QWEN_VISION_TRANSPORT_CANDIDATE_V0_1 =
    Object.freeze({send});
})();
