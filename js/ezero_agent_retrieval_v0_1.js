(function () {
  "use strict";

  const BUNDLE_URL =
    "data/ezero_agent_knowledge_bundle_v0_1.json?v=20260911-rag01";

  const MAX_RESULTS = 5;
  const MAX_CONTEXT_CHARS = 6500;

  let bundlePromise = null;

  const authorityWeight = Object.freeze({
    SCIENTIFIC_EVIDENCE_AUTHORITY: 8,
    VALIDATED_STATUS_SOURCE: 7,
    QWEN_AGENT_GOVERNANCE: 6,
    ARCHITECTURE_BOUNDARY: 5,
    VOICE_GUIDE_BOUNDARY: 5,
    VOICE_GUIDE_PHASE_BOUNDARY: 5,
    AI_TTS_INTEGRATION_BOUNDARY: 5,
    APPROVED_FEATURE_DESCRIPTION: 4,
    APPROVED_EXPLANATION_SOURCE: 3
  });

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}_\-]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(value) {
    return Array.from(
      new Set(
        normalize(value)
          .split(" ")
          .filter(function (token) {
            return token.length >= 2;
          })
      )
    );
  }

  async function loadBundle() {
    if (!bundlePromise) {
      bundlePromise = fetch(BUNDLE_URL, {
        cache: "no-store"
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error(
              "KNOWLEDGE_BUNDLE_HTTP_" + response.status
            );
          }

          return response.json();
        })
        .then(function (bundle) {
          if (
            !bundle ||
            bundle.status !== "READ_ONLY_APPROVED_KNOWLEDGE" ||
            !bundle.rules ||
            bundle.rules.retrieval_only !== true ||
            bundle.rules.agent_may_modify_sources !== false ||
            bundle.rules.live_self_training !== false ||
            !Array.isArray(bundle.chunks) ||
            !Array.isArray(bundle.sources)
          ) {
            throw new Error(
              "KNOWLEDGE_BUNDLE_BOUNDARY_INVALID"
            );
          }

          return bundle;
        });
    }

    return bundlePromise;
  }

  function scoreChunk(chunk, queryTokens, normalizedQuery) {
    const text = normalize(chunk.text);
    const path = normalize(chunk.path);
    const sourceClass = normalize(chunk.source_class);
    const authority = String(chunk.authority || "");

    let relevanceScore = 0;
    let matched = false;

    if (
      normalizedQuery &&
      normalizedQuery.length >= 3 &&
      text.includes(normalizedQuery)
    ) {
      relevanceScore += 30;
      matched = true;
    }

    queryTokens.forEach(function (token) {
      if (text.includes(token)) {
        relevanceScore += 4;
        matched = true;
      }

      if (path.includes(token)) {
        relevanceScore += 3;
        matched = true;
      }

      if (sourceClass.includes(token)) {
        relevanceScore += 2;
        matched = true;
      }
    });

    if (!matched) {
      return 0;
    }

    return relevanceScore +
      (authorityWeight[authority] || 1);
  }

  async function retrieve(question, options) {
    const query = String(question || "").trim();

    if (!query) {
      return Object.freeze({
        status: "EMPTY_QUERY",
        context: "",
        results: []
      });
    }

    const bundle = await loadBundle();
    const queryTokens = tokenize(query);
    const normalizedQuery = normalize(query);

    const ranked = bundle.chunks
      .map(function (chunk) {
        return {
          chunk: chunk,
          score: scoreChunk(
            chunk,
            queryTokens,
            normalizedQuery
          )
        };
      })
      .filter(function (item) {
        return item.score > 1;
      })
      .sort(function (a, b) {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return String(a.chunk.chunk_id)
          .localeCompare(String(b.chunk.chunk_id));
      });

    const requestedLimit =
      options &&
      Number.isInteger(options.limit)
        ? options.limit
        : MAX_RESULTS;

    const limit = Math.max(
      1,
      Math.min(MAX_RESULTS, requestedLimit)
    );

    const selected = [];
    let usedChars = 0;

    for (const item of ranked) {
      if (selected.length >= limit) {
        break;
      }

      const text = String(item.chunk.text || "");

      if (
        usedChars + text.length >
        MAX_CONTEXT_CHARS
      ) {
        continue;
      }

      selected.push({
        chunk_id: item.chunk.chunk_id,
        source_id: item.chunk.source_id,
        path: item.chunk.path,
        source_class: item.chunk.source_class,
        authority: item.chunk.authority,
        score: item.score,
        evidence_authority:
          item.chunk.authority ===
          "SCIENTIFIC_EVIDENCE_AUTHORITY",
        text: text
      });

      usedChars += text.length;
    }

    const context = selected
      .map(function (item) {
        return [
          "[SOURCE " + item.chunk_id + "]",
          "PATH: " + item.path,
          "AUTHORITY: " + item.authority,
          item.text
        ].join("\n");
      })
      .join("\n\n---\n\n");

    return Object.freeze({
      status:
        selected.length > 0
          ? "OK"
          : "NO_RELEVANT_APPROVED_KNOWLEDGE",
      context: context,
      results: Object.freeze(selected),
      source_count: bundle.source_count,
      chunk_count: bundle.chunk_count,
      read_only: true,
      live_self_training: false
    });
  }

  function resetCache() {
    bundlePromise = null;
  }

  window.EZERO_AGENT_RETRIEVAL_V0_1 =
    Object.freeze({
      version: "0.1",
      retrieve: retrieve,
      resetCache: resetCache
    });
})();
