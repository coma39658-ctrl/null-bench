"use strict";

global.window = {};
require("../js/benchmark006c_runtime_v0_1.js");

const R = window.EZERO_BENCHMARK006C_RUNTIME_V0_1;

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log("PASS:", name);
    passed++;
  } else {
    console.log("FAIL:", name);
    failed++;
  }
}

function expectThrow(name, fn) {
  try {
    fn();
    check(name, false);
  } catch (_) {
    check(name, true);
  }
}

const base = {
  public_seed: 7001,
  matrix_size: 48,
  perturbation_family: "LOCALIZED",
  magnitude: 0.25,
  noise_family: "GAUSSIAN",
  noise_level: 0.03
};

/* PRNG + seed boundary */
{
  const a = R.createCasePRNG(base);
  const b = R.createCasePRNG(base);

  const seqA = [a.random(), a.random(), a.random()];
  const seqB = [b.random(), b.random(), b.random()];

  check("deterministic PRNG", JSON.stringify(seqA) === JSON.stringify(seqB));
  expectThrow("protected seed 6201 rejected", () => R.validatePublicSeed(6201));
  expectThrow("protected seed 6210 rejected", () => R.validatePublicSeed(6210));
  expectThrow("invalid negative seed rejected", () => R.validatePublicSeed(-1));
  expectThrow("non-finite seed rejected", () => R.validatePublicSeed(Infinity));
}

/* Registered parameter fail-closed checks */
expectThrow("unsupported matrix rejected", () =>
  R.validateConfig({...base, matrix_size: 49})
);

expectThrow("unsupported magnitude rejected", () =>
  R.validateConfig({...base, magnitude: 0.33})
);

expectThrow("unsupported noise level rejected", () =>
  R.validateConfig({...base, noise_level: 0.02})
);

expectThrow("unsupported perturbation family rejected", () =>
  R.validateConfig({...base, perturbation_family: "UNKNOWN"})
);

expectThrow("unsupported noise family rejected", () =>
  R.validateConfig({...base, noise_family: "UNKNOWN"})
);

/* Noise determinism + finite values */
for (const family of ["GAUSSIAN", "LAPLACE", "STUDENT_T_DF3", "UNIFORM"]) {
  const cfg = {...base, noise_family: family};
  const a = R.generateNoiseSamples(cfg, 2000);
  const b = R.generateNoiseSamples(cfg, 2000);

  check(
    family + " deterministic",
    JSON.stringify(a.values) === JSON.stringify(b.values)
  );

  check(
    family + " finite",
    a.values.every(Number.isFinite)
  );
}

expectThrow("invalid noise count rejected", () =>
  R.generateNoiseSamples(base, 0)
);

/* Deterministic baseline matrix parity */
for (const N of [48, 100, 250, 500]) {
  const A = R.baselineMatrix(N);

  check(
    "baseline N=" + N + " size",
    A.length === N * N
  );

  let diagonalOK = true;
  for (let i = 0; i < N; i++) {
    if (A[i * N + i] !== (-1.0 - 0.01 * i)) {
      diagonalOK = false;
      break;
    }
  }

  check(
    "baseline N=" + N + " diagonal",
    diagonalOK
  );

  let superdiagOK = true;
  for (let i = 0; i < N - 1; i++) {
    if (A[i * N + i + 1] !== 0.05) {
      superdiagOK = false;
      break;
    }
  }

  check(
    "baseline N=" + N + " superdiagonal",
    superdiagOK
  );

  check(
    "baseline N=" + N + " wrap entry",
    A[(N - 1) * N] === 0.02
  );

  check(
    "baseline N=" + N + " finite",
    Array.from(A).every(Number.isFinite)
  );
}

expectThrow("baseline unregistered N rejected", () =>
  R.baselineMatrix(49)
);

/* Structural semantics */
const expectedSupport = {
  LOCALIZED: 1,
  DISTRIBUTED: 48 * 48,
  HUB_CENTRIC: 2 * (48 - 1),
  RANDOM_SPARSE: Math.max(1, Math.round(0.01 * 48 * 48)),
  LOW_RANK: 48 * 48,
  TRANSIENT: 1,
  GRADUAL_DRIFT: 1,
  STEP_CHANGE: 1
};

for (const family of Object.keys(expectedSupport)) {
  const cfg = {...base, perturbation_family: family};

  const a = R.generateStructuralPerturbation(cfg);
  const b = R.generateStructuralPerturbation(cfg);

  check(
    family + " support size",
    a.support_size === expectedSupport[family]
  );

  check(
    family + " Frobenius norm",
    Math.abs(a.realized_frobenius_norm - 0.25) < 1e-12
  );

  check(
    family + " deterministic",
    Array.from(a.values).every((x, i) => x === b.values[i])
  );
}

/* Exact deterministic algebraic checks */
{
  const localized = R.generateStructuralPerturbation({
    ...base,
    perturbation_family: "LOCALIZED"
  });

  check("LOCALIZED [0,1] equals magnitude", localized.values[1] === 0.25);

  const nonzero = Array.from(localized.values)
    .reduce((n, x) => n + (x !== 0 ? 1 : 0), 0);

  check("LOCALIZED exactly one nonzero entry", nonzero === 1);
}

{
  const distributed = R.generateStructuralPerturbation({
    ...base,
    perturbation_family: "DISTRIBUTED"
  });

  check(
    "DISTRIBUTED entry magnitude/N",
    distributed.values.every(x => x === 0.25 / 48)
  );
}

/* Temporal boundaries */
check(
  "TRANSIENT boundaries",
  R.temporalFactor("TRANSIENT", 1199) === 0 &&
  R.temporalFactor("TRANSIENT", 1200) === 1 &&
  R.temporalFactor("TRANSIENT", 1299) === 1 &&
  R.temporalFactor("TRANSIENT", 1300) === 0
);

check(
  "GRADUAL_DRIFT boundaries",
  R.temporalFactor("GRADUAL_DRIFT", 1199) === 0 &&
  R.temporalFactor("GRADUAL_DRIFT", 1200) === 0 &&
  R.temporalFactor("GRADUAL_DRIFT", 1999) === 1
);

check(
  "STEP_CHANGE boundaries",
  R.temporalFactor("STEP_CHANGE", 1199) === 0 &&
  R.temporalFactor("STEP_CHANGE", 1200) === 1 &&
  R.temporalFactor("STEP_CHANGE", 1999) === 1
);

expectThrow("temporal index 2000 rejected", () =>
  R.temporalFactor("TRANSIENT", 2000)
);

console.log("-----");
console.log("PASSED =", passed);
console.log("FAILED =", failed);

if (failed !== 0) {
  process.exit(1);
}
