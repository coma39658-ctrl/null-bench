"use strict";

(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function failDisplay(message) {
    const status = byId("benchmark006cStatus");
    const summary = byId("benchmark006cSummary");
    const evidence = byId("benchmark006cEvidence");

    if (status) {
      status.textContent = "FAIL-CLOSED — " + message;
    }

    if (summary) {
      summary.hidden = true;
      summary.textContent = "";
    }

    if (evidence) {
      evidence.hidden = true;
    }
  }

  function temporalSummary(R, family) {
    if (family === "TRANSIENT") {
      return "0 before 1200; full strength 1200–1299; recovery from 1300.";
    }

    if (family === "GRADUAL_DRIFT") {
      return "0 through sample 1200; linear rise to full strength at sample 1999.";
    }

    if (family === "STEP_CHANGE") {
      return "0 before sample 1200; full strength from 1200–1999.";
    }

    return "Static spatial perturbation envelope.";
  }

  function runScenario() {
    try {
      const R = window.EZERO_BENCHMARK006C_RUNTIME_V0_1;

      if (!R) {
        throw new Error("Benchmark 006-C runtime unavailable");
      }

      const config = {
        public_seed: Number(byId("benchmark006cSeed").value),
        matrix_size: Number(byId("benchmark006cMatrix").value),
        perturbation_family: byId("benchmark006cFamily").value,
        magnitude: Number(byId("benchmark006cMagnitude").value),
        noise_family: byId("benchmark006cNoiseFamily").value,
        noise_level: Number(byId("benchmark006cNoiseLevel").value)
      };

      const start = performance.now();

      const baseline = R.baselineMatrix(config.matrix_size);
      const structural = R.generateStructuralPerturbation(config);
      const noise = R.generateNoiseSamples(config, 2000);

      const end = performance.now();

      const runtimeMs = end - start;

      if (!Number.isFinite(runtimeMs)) {
        throw new Error("non-finite browser runtime");
      }

      const status = byId("benchmark006cStatus");
      const summary = byId("benchmark006cSummary");
      const evidence = byId("benchmark006cEvidence");
      const raw = byId("benchmark006cRaw");

      status.textContent =
        "SUCCESS — SYNTHETIC_SIMULATED · PUBLIC_INTERACTIVE";

      summary.hidden = false;
      summary.innerHTML =
        "<strong>Matrix dimension:</strong> " + config.matrix_size + "<br>" +
        "<strong>Perturbation family:</strong> " + config.perturbation_family + "<br>" +
        "<strong>Requested magnitude:</strong> " + config.magnitude.toFixed(2) + "<br>" +
        "<strong>Realized Frobenius norm:</strong> " +
          structural.realized_frobenius_norm.toFixed(12) + "<br>" +
        "<strong>Support size:</strong> " + structural.support_size + "<br>" +
        "<strong>Noise family:</strong> " + config.noise_family + "<br>" +
        "<strong>Noise level:</strong> " + config.noise_level.toFixed(2) + "<br>" +
        "<strong>Seed namespace:</strong> PUBLIC_INTERACTIVE<br>" +
        "<strong>Public seed:</strong> " + config.public_seed + "<br>" +
        "<strong>Generation status:</strong> SUCCESS<br>" +
        "<strong>Temporal ground truth:</strong> " +
          temporalSummary(R, config.perturbation_family) + "<br>" +
        "<strong>Browser runtime:</strong> " + runtimeMs.toFixed(3) +
          " ms <em>(local browser timing only; not universal hardware performance)</em>";

      const evidencePayload = {
        benchmark:
          "GSRL-Reviewed Collaborative Synthetic Benchmark — Track 006-C",
        browser_runtime_version: R.RUNTIME_VERSION,
        provenance: "SYNTHETIC_SIMULATED",
        seed_namespace: "PUBLIC_INTERACTIVE",
        public_interactive_seed: config.public_seed,
        internal_seed: structural.internal_seed,
        matrix_dimension: config.matrix_size,
        baseline_entries: baseline.length,
        perturbation_family: config.perturbation_family,
        requested_magnitude: config.magnitude,
        realized_frobenius_norm: structural.realized_frobenius_norm,
        support_size: structural.support_size,
        noise_family: config.noise_family,
        noise_level: config.noise_level,
        generated_noise_samples: noise.values.length,
        temporal_ground_truth: structural.temporal_ground_truth,
        registered_evaluation_evidence: false,
        independent_gsrl_validation: false,
        real_sensor_validation: false,
        physical_validation: false,
        diagnostic_claim: false,
        safety_certification: false,
        hil_qualification: false,
        timing_environment_note:
          "Browser-local runtime only; not universal FPGA, ARM, HIL, or hardware performance."
      };

      raw.textContent = JSON.stringify(evidencePayload, null, 2);
      evidence.hidden = false;
    } catch (error) {
      failDisplay(error && error.message ? error.message : String(error));
    }
  }

  function initialize() {
    const button = byId("benchmark006cRun");

    if (!button) {
      return;
    }

    button.addEventListener("click", runScenario);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
