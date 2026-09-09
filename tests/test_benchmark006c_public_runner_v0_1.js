"use strict";

const elements = {};

function makeElement(id, value = "") {
  const el = {
    id,
    value,
    textContent: "",
    innerHTML: "",
    hidden: false,
    listeners: {},
    addEventListener(type, fn) {
      this.listeners[type] = fn;
    },
    click() {
      if (this.listeners.click) {
        this.listeners.click();
      }
    }
  };

  elements[id] = el;
  return el;
}

global.window = {};
global.performance = {
  now: (() => {
    let t = 100;
    return () => (t += 1.25);
  })()
};

global.document = {
  readyState: "complete",
  getElementById(id) {
    return elements[id] || null;
  },
  addEventListener() {}
};

makeElement("benchmark006cSeed", "7001");
makeElement("benchmark006cMatrix", "48");
makeElement("benchmark006cFamily", "RANDOM_SPARSE");
makeElement("benchmark006cMagnitude", "0.25");
makeElement("benchmark006cNoiseFamily", "GAUSSIAN");
makeElement("benchmark006cNoiseLevel", "0.03");
makeElement("benchmark006cRun");
makeElement("benchmark006cStatus");
makeElement("benchmark006cSummary");
makeElement("benchmark006cEvidence");
makeElement("benchmark006cRaw");

require("../js/benchmark006c_runtime_v0_1.js");
require("../js/benchmark006c_public_runner_v0_1.js");

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

/* Successful public run */
elements.benchmark006cRun.click();

check(
  "runner success status",
  elements.benchmark006cStatus.textContent.includes("SUCCESS")
);

check(
  "synthetic provenance visible",
  elements.benchmark006cStatus.textContent.includes("SYNTHETIC_SIMULATED")
);

check(
  "PUBLIC_INTERACTIVE namespace visible",
  elements.benchmark006cStatus.textContent.includes("PUBLIC_INTERACTIVE")
);

check(
  "summary displayed",
  elements.benchmark006cSummary.hidden === false
);

check(
  "realized Frobenius displayed",
  elements.benchmark006cSummary.innerHTML.includes("0.250000000000")
);

check(
  "runtime timing limitation displayed",
  elements.benchmark006cSummary.innerHTML.includes(
    "not universal hardware performance"
  )
);

check(
  "evidence panel displayed",
  elements.benchmark006cEvidence.hidden === false
);

const evidence = JSON.parse(elements.benchmark006cRaw.textContent);

check(
  "evidence provenance exact",
  evidence.provenance === "SYNTHETIC_SIMULATED"
);

check(
  "seed namespace exact",
  evidence.seed_namespace === "PUBLIC_INTERACTIVE"
);

check(
  "registered evidence false",
  evidence.registered_evaluation_evidence === false
);

check(
  "independent GSRL validation false",
  evidence.independent_gsrl_validation === false
);

check(
  "real sensor validation false",
  evidence.real_sensor_validation === false
);

check(
  "physical validation false",
  evidence.physical_validation === false
);

check(
  "diagnostic claim false",
  evidence.diagnostic_claim === false
);

check(
  "safety certification false",
  evidence.safety_certification === false
);

check(
  "HIL qualification false",
  evidence.hil_qualification === false
);

/* Protected evaluation seed must fail closed */
elements.benchmark006cSeed.value = "6201";
elements.benchmark006cRun.click();

check(
  "protected seed fail-closed status",
  elements.benchmark006cStatus.textContent.startsWith("FAIL-CLOSED")
);

check(
  "protected seed does not show summary",
  elements.benchmark006cSummary.hidden === true
);

check(
  "protected seed hides evidence",
  elements.benchmark006cEvidence.hidden === true
);

/* Unsupported matrix injected through DOM must fail closed */
elements.benchmark006cSeed.value = "7001";
elements.benchmark006cMatrix.value = "49";
elements.benchmark006cRun.click();

check(
  "unsupported matrix fail-closed",
  elements.benchmark006cStatus.textContent.startsWith("FAIL-CLOSED")
);

console.log("-----");
console.log("PASSED =", passed);
console.log("FAILED =", failed);

if (failed !== 0) {
  process.exit(1);
}
