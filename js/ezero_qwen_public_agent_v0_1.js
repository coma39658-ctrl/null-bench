(function () {
  "use strict";

  const MAX_HISTORY_MESSAGES = 12; // 6 user/assistant turns
  const MAX_QUESTION_CHARS = 4000;
  const MAX_ANSWER_CHARS = 12000;
  const REQUEST_TIMEOUT_MS = 30000;

  const history = [];

  const sessionId =
    window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : "ezero-session-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2);

  function isPrivateHost(hostname) {
    const host = String(hostname || "").toLowerCase();

    if (
      host === "localhost" ||
      host === "::1" ||
      host === "[::1]" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host)
    ) {
      return true;
    }

    const match172 = host.match(/^172\.(\d+)\./);

    if (match172) {
      const second = Number(match172[1]);

      if (second >= 16 && second <= 31) {
        return true;
      }
    }

    return false;
  }

  function validateEndpoint(endpoint) {
    let url;

    try {
      url = new URL(endpoint);
    } catch (_) {
      throw new Error("AI_ENDPOINT_INVALID");
    }

    if (url.protocol !== "https:") {
      throw new Error("AI_ENDPOINT_HTTPS_REQUIRED");
    }

    if (isPrivateHost(url.hostname)) {
      throw new Error("AI_ENDPOINT_PRIVATE_HOST_BLOCKED");
    }

    return url.toString();
  }

  function validateResponse(data) {
    if (!data || typeof data !== "object") {
      throw new Error("AI_RESPONSE_INVALID_OBJECT");
    }

    const allowedStatus = [
      "OK",
      "INSUFFICIENT_VERIFIED_EZERO_EVIDENCE"
    ];

    if (!allowedStatus.includes(data.status)) {
      throw new Error("AI_RESPONSE_INVALID_STATUS");
    }

    if (
      data.diagnostic_claim !== false ||
      data.evidence_authority !== false
    ) {
      throw new Error("AI_RESPONSE_SAFETY_BOUNDARY_FAILED");
    }

    if (data.status === "OK") {
      const allowedSourceClasses = [
        "GOVERNED_AI",
        "VERIFIED_STATIC"
      ];

      if (
        !allowedSourceClasses.includes(data.source_class) ||
        typeof data.answer !== "string" ||
        !data.answer.trim()
      ) {
        throw new Error("AI_RESPONSE_SCHEMA_FAILED");
      }

      if (data.answer.length > MAX_ANSWER_CHARS) {
        throw new Error("AI_RESPONSE_TOO_LONG");
      }
    }

    if (
      data.status === "INSUFFICIENT_VERIFIED_EZERO_EVIDENCE" &&
      data.source_class !== "FAIL_CLOSED"
    ) {
      throw new Error("AI_FAIL_CLOSED_SCHEMA_FAILED");
    }

    return data;
  }

  function appendTurn(question, answer) {
    history.push({
      role: "user",
      content: question
    });

    history.push({
      role: "assistant",
      content: answer
    });

    while (history.length > MAX_HISTORY_MESSAGES) {
      history.shift();
    }
  }

  async function getRetrievalHints(question) {
    const emptyHints = Object.freeze({
      protocol_version: "0.1",
      chunk_ids: Object.freeze([])
    });

    if (
      !window.EZERO_AGENT_RETRIEVAL_V0_1 ||
      typeof window.EZERO_AGENT_RETRIEVAL_V0_1.retrieve !== "function"
    ) {
      return emptyHints;
    }

    try {
      const retrieval =
        await window.EZERO_AGENT_RETRIEVAL_V0_1.retrieve(
          question,
          { limit: 5 }
        );

      if (
        !retrieval ||
        !Array.isArray(retrieval.results)
      ) {
        return emptyHints;
      }

      const chunkIds = retrieval.results
        .map(function (item) {
          return item && typeof item.chunk_id === "string"
            ? item.chunk_id
            : "";
        })
        .filter(Boolean)
        .slice(0, 5);

      return Object.freeze({
        protocol_version: "0.1",
        chunk_ids: Object.freeze(chunkIds)
      });

    } catch (error) {
      console.warn(
        "E-ZERO client retrieval hints unavailable; gateway retrieval remains authoritative:",
        error
      );

      return emptyHints;
    }
  }

  async function ask(options) {
    const config = options || {};

    const enabled =
      window.EZERO_PUBLIC_AI_ENABLED === true;

    const rawEndpoint =
      typeof window.EZERO_PUBLIC_AI_ENDPOINT === "string"
        ? window.EZERO_PUBLIC_AI_ENDPOINT.trim()
        : "";

    if (!enabled) {
      throw new Error("PUBLIC_AI_DISABLED");
    }

    if (!rawEndpoint) {
      throw new Error("PUBLIC_AI_ENDPOINT_NOT_CONFIGURED");
    }

    const endpoint = validateEndpoint(rawEndpoint);

    const question =
      typeof config.question === "string"
        ? config.question.trim()
        : "";

    if (!question) {
      throw new Error("AI_QUESTION_EMPTY");
    }

    if (question.length > MAX_QUESTION_CHARS) {
      throw new Error("AI_QUESTION_TOO_LONG");
    }

    const responseLanguage =
      typeof config.responseLanguage === "string" &&
      config.responseLanguage.trim()
        ? config.responseLanguage.trim()
        : "en";

    const answerLength = ["short", "normal", "detailed"].includes(
      config.answerLength
    )
      ? config.answerLength
      : "normal";

    const retrievalHints =
      await getRetrievalHints(question);

    const controller = new AbortController();

    const timeoutId = window.setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          question: question,
          // AI language is independent of the website's 15-language UI.
          // Qwen should answer in the language/script used by the user.
          response_language: "auto",
          // If the question is too short/ambiguous to identify a language,
          // fall back to the language currently selected on the website.
          fallback_language: responseLanguage,
          answer_length: answerLength,
          session_id: sessionId,
          history: history.slice(-MAX_HISTORY_MESSAGES),
          retrieval_hints: retrievalHints
        })
      });

      if (!response.ok) {
        throw new Error("AI_GATEWAY_HTTP_" + response.status);
      }

      const data = validateResponse(await response.json());

      if (data.status === "OK") {
        appendTurn(question, data.answer.trim());
      }

      return Object.freeze({
        status: data.status,
        answer:
          typeof data.answer === "string"
            ? data.answer.trim()
            : "",
        source_class: data.source_class,
        diagnostic_claim: false,
        evidence_authority: false
      });

    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("AI_GATEWAY_TIMEOUT");
      }

      throw error;

    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function resetSession() {
    history.length = 0;
  }

  function getState() {
    return Object.freeze({
      enabled: window.EZERO_PUBLIC_AI_ENABLED === true,
      session_id: sessionId,
      history_messages: history.length,
      max_history_messages: MAX_HISTORY_MESSAGES,
      persistent_memory: false
    });
  }

  window.EZERO_QWEN_PUBLIC_AGENT_V0_1 = Object.freeze({
    version: "0.1",
    ask: ask,
    resetSession: resetSession,
    getState: getState
  });
})();
