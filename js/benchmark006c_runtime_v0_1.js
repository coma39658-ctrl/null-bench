"use strict";

(function () {
  const RUNTIME_VERSION = "benchmark006c-public-browser-runtime-v0.1";
  const SEED_NAMESPACE = "PUBLIC_INTERACTIVE";

  const REGISTERED_MATRIX_SIZES = new Set([48, 100, 250, 500]);
  const REGISTERED_MAGNITUDES = new Set([0.05, 0.10, 0.25, 0.50, 1.00]);
  const REGISTERED_NOISE_LEVELS = new Set([0.01, 0.03, 0.05, 0.10]);

  const REGISTERED_PERTURBATION_FAMILIES = new Set([
    "LOCALIZED",
    "DISTRIBUTED",
    "HUB_CENTRIC",
    "RANDOM_SPARSE",
    "LOW_RANK",
    "TRANSIENT",
    "GRADUAL_DRIFT",
    "STEP_CHANGE"
  ]);

  const REGISTERED_NOISE_FAMILIES = new Set([
    "GAUSSIAN",
    "LAPLACE",
    "STUDENT_T_DF3",
    "UNIFORM"
  ]);

  function fail(message) {
    throw new Error("BENCHMARK006C_FAIL_CLOSED: " + message);
  }

  function validatePublicSeed(value) {
    const seed = Number(value);

    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) {
      fail("invalid public seed");
    }

    if (seed >= 6201 && seed <= 6210) {
      fail("protected registered-evaluation seed rejected");
    }

    return seed;
  }

  function validateConfig(config) {
    if (!config || typeof config !== "object") {
      fail("configuration must be an object");
    }

    const publicSeed = validatePublicSeed(config.public_seed);
    const matrixSize = Number(config.matrix_size);
    const magnitude = Number(config.magnitude);
    const noiseLevel = Number(config.noise_level);
    const perturbationFamily = String(config.perturbation_family || "").toUpperCase();
    const noiseFamily = String(config.noise_family || "").toUpperCase();

    if (!REGISTERED_MATRIX_SIZES.has(matrixSize)) {
      fail("unsupported matrix size");
    }

    if (!REGISTERED_MAGNITUDES.has(magnitude)) {
      fail("unsupported magnitude");
    }

    if (!REGISTERED_NOISE_LEVELS.has(noiseLevel)) {
      fail("unsupported noise level");
    }

    if (!REGISTERED_PERTURBATION_FAMILIES.has(perturbationFamily)) {
      fail("unsupported perturbation family");
    }

    if (!REGISTERED_NOISE_FAMILIES.has(noiseFamily)) {
      fail("unsupported noise family");
    }

    return Object.freeze({
      namespace: SEED_NAMESPACE,
      public_seed: publicSeed,
      matrix_size: matrixSize,
      perturbation_family: perturbationFamily,
      magnitude: magnitude,
      noise_family: noiseFamily,
      noise_level: noiseLevel,
      browser_runtime_version: RUNTIME_VERSION
    });
  }

  function canonicalCaseDescriptor(config) {
    const c = validateConfig(config);

    return [
      "namespace=" + c.namespace,
      "public_seed=" + c.public_seed,
      "matrix_size=" + c.matrix_size,
      "perturbation_family=" + c.perturbation_family,
      "magnitude=" + c.magnitude.toFixed(2),
      "noise_family=" + c.noise_family,
      "noise_level=" + c.noise_level.toFixed(2),
      "browser_runtime_version=" + c.browser_runtime_version
    ].join("\n");
  }

  function deriveSeed32(descriptor) {
    const bytes = new TextEncoder().encode(String(descriptor));

    // FNV-1a 32-bit deterministic UTF-8 hash.
    let hash = 0x811c9dc5;

    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193);
    }

    const seed = hash >>> 0;

    if (seed >= 6201 && seed <= 6210) {
      fail("derived internal seed entered protected range");
    }

    return seed;
  }

  function mulberry32(seed) {
    let state = seed >>> 0;

    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function sampleGaussian(random) {
    let u1 = random();
    const u2 = random();

    if (!Number.isFinite(u1) || !Number.isFinite(u2)) {
      fail("non-finite PRNG output");
    }

    if (u1 <= 0 || u1 >= 1 || u2 < 0 || u2 >= 1) {
      fail("invalid PRNG output for Gaussian Box-Muller");
    }

    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    if (!Number.isFinite(z)) {
      fail("non-finite Gaussian sample");
    }

    return z;
  }

  function sampleLaplace(random) {
    const u = random();

    if (!Number.isFinite(u) || u < 0 || u >= 1) {
      fail("invalid PRNG output for Laplace");
    }

    const centered = u - 0.5;
    const scale = 1 / Math.sqrt(2);
    const x = -scale * Math.sign(centered || 1) * Math.log(1 - 2 * Math.abs(centered));

    if (!Number.isFinite(x)) {
      fail("non-finite Laplace sample");
    }

    return x;
  }

  function sampleStudentTdf3(random) {
    const g = sampleGaussian(random);

    let chi2 = 0;
    for (let i = 0; i < 3; i++) {
      const z = sampleGaussian(random);
      chi2 += z * z;
    }

    if (!Number.isFinite(chi2) || chi2 <= 0) {
      fail("invalid chi-square denominator");
    }

    const t = g / Math.sqrt(chi2 / 3);
    const standardized = t / Math.sqrt(3);

    if (!Number.isFinite(standardized)) {
      fail("non-finite Student-t df3 sample");
    }

    return standardized;
  }

  function sampleUniform(random) {
    const u = random();

    if (!Number.isFinite(u) || u < 0 || u >= 1) {
      fail("invalid PRNG output for Uniform");
    }

    const x = (2 * u - 1) * Math.sqrt(3);

    if (!Number.isFinite(x)) {
      fail("non-finite Uniform sample");
    }

    return x;
  }

  function sampleStandardNoise(noiseFamily, random) {
    switch (noiseFamily) {
      case "GAUSSIAN":
        return sampleGaussian(random);
      case "LAPLACE":
        return sampleLaplace(random);
      case "STUDENT_T_DF3":
        return sampleStudentTdf3(random);
      case "UNIFORM":
        return sampleUniform(random);
      default:
        fail("unsupported noise family");
    }
  }

  function generateNoiseSamples(config, count) {
    const c = validateConfig(config);

    if (!Number.isSafeInteger(count) || count < 1) {
      fail("invalid noise sample count");
    }

    const casePRNG = createCasePRNG(c);
    const out = new Array(count);

    for (let i = 0; i < count; i++) {
      const standardized = sampleStandardNoise(c.noise_family, casePRNG.random);
      const value = standardized * c.noise_level;

      if (!Number.isFinite(value)) {
        fail("non-finite generated noise value");
      }

      out[i] = value;
    }

    return Object.freeze({
      config: c,
      internal_seed: casePRNG.internal_seed,
      values: Object.freeze(out)
    });
  }

  function baselineMatrix(N) {
    if (!REGISTERED_MATRIX_SIZES.has(N)) {
      fail("unsupported matrix dimension");
    }

    const out = new Float64Array(N * N);

    for (let i = 0; i < N; i++) {
      out[i * N + i] = -1.0 - 0.01 * i;
    }

    for (let i = 0; i < N - 1; i++) {
      out[i * N + (i + 1)] = 0.05;
    }

    out[(N - 1) * N] = 0.02;

    for (const x of out) {
      if (!Number.isFinite(x)) {
        fail("non-finite baseline matrix");
      }
    }

    return out;
  }

  function frobeniusNorm(values) {
    let sumsq = 0;

    for (const x of values) {
      if (!Number.isFinite(x)) {
        fail("non-finite structural value");
      }
      sumsq += x * x;
    }

    const norm = Math.sqrt(sumsq);

    if (!Number.isFinite(norm)) {
      fail("non-finite Frobenius norm");
    }

    return norm;
  }

  function scaleToMagnitude(values, magnitude) {
    const norm = frobeniusNorm(values);

    if (!(norm > 0)) {
      fail("zero-norm stochastic direction");
    }

    const scale = magnitude / norm;
    const out = new Float64Array(values.length);

    for (let i = 0; i < values.length; i++) {
      const x = values[i] * scale;

      if (!Number.isFinite(x)) {
        fail("non-finite generated structural value");
      }

      out[i] = x;
    }

    return out;
  }

  function localizedDirection(N, magnitude) {
    const out = new Float64Array(N * N);
    out[1] = magnitude;
    return out;
  }

  function distributedDirection(N, magnitude) {
    const value = magnitude / N;

    if (!Number.isFinite(value)) {
      fail("non-finite distributed value");
    }

    const out = new Float64Array(N * N);
    out.fill(value);
    return out;
  }

  function hubCentricDirection(N, magnitude) {
    const raw = new Float64Array(N * N);

    for (let j = 1; j < N; j++) {
      raw[j] = 1;
    }

    for (let i = 1; i < N; i++) {
      raw[i * N] = 1;
    }

    return scaleToMagnitude(raw, magnitude);
  }

  function sampleUniquePositions(total, k, random) {
    if (!Number.isSafeInteger(total) || total < 1 ||
        !Number.isSafeInteger(k) || k < 1 || k > total) {
      fail("invalid sparse support request");
    }

    const selected = new Set();

    while (selected.size < k) {
      const u = random();

      if (!Number.isFinite(u) || u < 0 || u >= 1) {
        fail("invalid PRNG output for sparse support");
      }

      selected.add(Math.floor(u * total));
    }

    return Array.from(selected);
  }

  function randomSparseDirection(N, magnitude, random) {
    const total = N * N;
    const k = Math.max(1, Math.round(0.01 * total));
    const positions = sampleUniquePositions(total, k, random);
    const raw = new Float64Array(total);

    for (const index of positions) {
      raw[index] = sampleGaussian(random);
    }

    return Object.freeze({
      values: scaleToMagnitude(raw, magnitude),
      support_size: k
    });
  }

  function lowRankDirection(N, magnitude, random) {
    const u = new Float64Array(N);
    const v = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      u[i] = sampleGaussian(random);
      v[i] = sampleGaussian(random);
    }

    const unorm = Math.sqrt(u.reduce((s, x) => s + x * x, 0));
    const vnorm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));

    if (!(unorm > 0) || !(vnorm > 0) ||
        !Number.isFinite(unorm) || !Number.isFinite(vnorm)) {
      fail("zero-norm stochastic direction");
    }

    const out = new Float64Array(N * N);

    for (let i = 0; i < N; i++) {
      const ui = u[i] / unorm;

      for (let j = 0; j < N; j++) {
        const value = magnitude * ui * (v[j] / vnorm);

        if (!Number.isFinite(value)) {
          fail("non-finite low-rank value");
        }

        out[i * N + j] = value;
      }
    }

    return out;
  }

  function temporalFactor(family, t) {
    if (!Number.isSafeInteger(t) || t < 0 || t > 1999) {
      fail("invalid temporal sample index");
    }

    switch (family) {
      case "TRANSIENT":
        return (t >= 1200 && t <= 1299) ? 1 : 0;

      case "GRADUAL_DRIFT":
        if (t < 1200) return 0;
        return (t - 1200) / (1999 - 1200);

      case "STEP_CHANGE":
        return t >= 1200 ? 1 : 0;

      default:
        return 1;
    }
  }

  function generateStructuralPerturbation(config) {
    const c = validateConfig(config);
    const N = c.matrix_size;
    const casePRNG = createCasePRNG(c);

    let values;
    let supportSize;

    switch (c.perturbation_family) {
      case "LOCALIZED":
      case "TRANSIENT":
      case "GRADUAL_DRIFT":
      case "STEP_CHANGE":
        values = localizedDirection(N, c.magnitude);
        supportSize = 1;
        break;

      case "DISTRIBUTED":
        values = distributedDirection(N, c.magnitude);
        supportSize = N * N;
        break;

      case "HUB_CENTRIC":
        values = hubCentricDirection(N, c.magnitude);
        supportSize = 2 * (N - 1);
        break;

      case "RANDOM_SPARSE": {
        const result = randomSparseDirection(N, c.magnitude, casePRNG.random);
        values = result.values;
        supportSize = result.support_size;
        break;
      }

      case "LOW_RANK":
        values = lowRankDirection(N, c.magnitude, casePRNG.random);
        supportSize = N * N;
        break;

      default:
        fail("unsupported perturbation family");
    }

    const norm = frobeniusNorm(values);

    if (!Number.isFinite(norm)) {
      fail("non-finite realized Frobenius norm");
    }

    return Object.freeze({
      config: c,
      internal_seed: casePRNG.internal_seed,
      values,
      support_size: supportSize,
      realized_frobenius_norm: norm,
      temporal_ground_truth: Object.freeze({
        total_samples: 2000,
        calibration_start: 0,
        calibration_end: 799,
        monitoring_start: 800,
        monitoring_end: 1999,
        change_point: 1200
      })
    });
  }

  function createCasePRNG(config) {
    const validated = validateConfig(config);
    const descriptor = canonicalCaseDescriptor(validated);
    const internalSeed = deriveSeed32(descriptor);

    return Object.freeze({
      config: validated,
      descriptor: descriptor,
      internal_seed: internalSeed,
      random: mulberry32(internalSeed)
    });
  }

  window.EZERO_BENCHMARK006C_RUNTIME_V0_1 = Object.freeze({
    RUNTIME_VERSION,
    SEED_NAMESPACE,
    validatePublicSeed,
    validateConfig,
    canonicalCaseDescriptor,
    deriveSeed32,
    mulberry32,
    sampleGaussian,
    sampleLaplace,
    sampleStudentTdf3,
    sampleUniform,
    sampleStandardNoise,
    generateNoiseSamples,
    baselineMatrix,
    frobeniusNorm,
    localizedDirection,
    distributedDirection,
    hubCentricDirection,
    randomSparseDirection,
    lowRankDirection,
    temporalFactor,
    generateStructuralPerturbation,
    createCasePRNG
  });
})();
