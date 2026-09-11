/*
 * E-ZERO Voice Guide — Verified Public Knowledge V0.1
 *
 * Role:
 * Deterministic public website guidance only.
 *
 * Boundaries:
 * - No definitive diagnosis
 * - No physical-validation claim
 * - No safety-certification claim
 * - No autonomous-control claim
 * - No unsupported scientific claim
 * - Unknown questions must fail closed
 */

(function () {
  "use strict";

  const KNOWLEDGE_VERSION = "ezero-voice-guide-knowledge-v0.1";

  const entries = [
    {
      id: "ezero_overview",
      keywords: [
        "e-zero", "ezero", "what is e-zero", "about e-zero",
        "ای زیرو", "ای زیرو کیا ہے", "سسٹم کیا ہے"
      ],
      en:
        "E-ZERO is an evidence-first intelligence platform for testing, screening, and validating network, vehicle, industrial, and fleet data. It keeps software validation separate from real-world proof and makes limitations visible.",
      en_short:
        "E-ZERO is an evidence-first platform for testing and screening network, vehicle, industrial, and fleet data while keeping software evidence separate from real-world proof.",
      en_detailed:
        "E-ZERO is an evidence-first intelligence platform for testing, screening, and validating network, vehicle, industrial, and fleet data. Its design keeps computational or software validation separate from statistical evidence and real-world physical proof. The platform includes research tools such as Null Bench, read-only Vehicle / OBD workflows, industrial condition-screening components, fleet/shared-access interfaces, and evidence-governance layers. Results must stay within registered evidence boundaries, and limitations are shown explicitly rather than converted into unsupported diagnosis, safety certification, or autonomous control claims.",
      ur:
        "E-ZERO ایک evidence-first intelligence platform ہے جو network، vehicle، industrial اور fleet data کی testing، screening اور validation کے لیے بنایا گیا ہے۔ یہ software validation کو real-world proof سے الگ رکھتا ہے اور limitations واضح دکھاتا ہے۔",
      ur_short:
        "E-ZERO ایک evidence-first platform ہے جو network، vehicle، industrial اور fleet data کی testing اور screening کرتا ہے، جبکہ software evidence کو real-world proof سے الگ رکھتا ہے۔",
      ur_detailed:
        "E-ZERO ایک evidence-first intelligence platform ہے جو network، vehicle، industrial اور fleet data کی testing، screening اور validation کے لیے بنایا گیا ہے۔ اس کا بنیادی اصول یہ ہے کہ computational یا software validation، statistical evidence اور real-world physical proof کو الگ رکھا جائے۔ Platform میں Null Bench research tool، read-only Vehicle / OBD workflows، industrial condition-screening components، fleet/shared-access interfaces اور evidence-governance layers شامل ہیں۔ ہر result کو registered evidence boundaries کے اندر پیش کیا جاتا ہے، limitations واضح دکھائی جاتی ہیں، اور بغیر الگ validation کے definitive diagnosis، safety certification یا autonomous control claim نہیں کیا جاتا۔"
    },

    {
      id: "null_bench",
      keywords: [
        "null bench", "run test", "network test", "degree preserving",
        "نل بینچ", "نیٹ ورک ٹیسٹ", "رن ٹیسٹ"
      ],
      en:
        "Null Bench tests whether an observed network pattern stands out from degree-preserving random rewiring. The public tool runs locally in the browser. Its result is statistical or computational evidence, not physical proof.",
      ur:
        "Null Bench یہ جانچتا ہے کہ کسی network کا observed pattern degree-preserving random rewiring کے مقابلے میں واقعی نمایاں ہے یا نہیں۔ Public tool browser میں locally چلتا ہے۔ اس کا نتیجہ statistical یا computational evidence ہے، physical proof نہیں۔"
    },

    {
      id: "vehicle_obd",
      keywords: [
        "vehicle", "obd", "obd2", "car", "engine", "vehicle obd",
        "گاڑی", "او بی ڈی", "انجن", "کار"
      ],
      en:
        "The Vehicle / OBD area is for read-only vehicle data screening and supported OBD functions within registered E-ZERO boundaries. Sensor or OBD data must not be presented as a definitive component diagnosis unless separately validated.",
      ur:
        "Vehicle / OBD حصہ read-only vehicle data screening اور registered E-ZERO boundaries کے اندر supported OBD functions کے لیے ہے۔ Sensor یا OBD data کو الگ validation کے بغیر definitive component diagnosis نہیں کہا جاتا۔"
    },

    {
      id: "industrial",
      keywords: [
        "industrial", "machine", "machinery", "factory",
        "انڈسٹریل", "مشین", "مشینری", "فیکٹری"
      ],
      en:
        "Industrial Intelligence is intended for evidence-based condition screening of machinery and industrial sensor data. Its indicators must be driven by registered data and thresholds, with unknown or invalid data kept separate from normal status.",
      ur:
        "Industrial Intelligence مشینری اور industrial sensor data کی evidence-based condition screening کے لیے ہے۔ اس کے indicators registered data اور thresholds سے چلنے چاہئیں، جبکہ unknown یا invalid data کو normal status سے الگ رکھا جاتا ہے۔"
    },

    {
      id: "fleet",
      keywords: [
        "fleet", "fleet access", "vehicles group",
        "فلیٹ", "گاڑیوں کا گروپ"
      ],
      en:
        "The Fleet section is the E-ZERO area for shared or multi-vehicle information and fleet-oriented workflows. It remains separate from individual vehicle diagnosis and from autonomous control.",
      ur:
        "Fleet section shared یا multi-vehicle information اور fleet-oriented workflows کے لیے ہے۔ اسے individual vehicle diagnosis اور autonomous control سے الگ رکھا جاتا ہے۔"
    },

    {
      id: "benchmark006c",
      keywords: [
        "benchmark 006-c", "006-c", "006c", "benchmark006c",
        "بینچ مارک 006", "006 سی"
      ],
      en:
        "Benchmark 006-C is a collaborative synthetic browser-runtime benchmark. Public runs are synthetic and exploratory computational outputs only. They are not independent GSRL validation, real-sensor validation, physical validation, diagnosis, safety certification, or HIL qualification.",
      ur:
        "Benchmark 006-C ایک collaborative synthetic browser-runtime benchmark ہے۔ Public runs صرف synthetic اور exploratory computational outputs ہیں۔ یہ independent GSRL validation، real-sensor validation، physical validation، diagnosis، safety certification یا HIL qualification نہیں ہیں۔"
    },

    {
      id: "adaptive_decision_lab",
      keywords: [
        "adaptive decision", "decision lab", "state encoder",
        "adaptive decision lab", "اڈیپٹو", "ڈسیژن لیب", "سٹیٹ انکوڈر"
      ],
      en:
        "The Adaptive Decision Lab is a separate offline and synthetic decision-intelligence research module. Its Phase 1.6.1 deterministic State Encoder is frozen with dedicated and full-regression test evidence. A trained public agent, protected held-out validation, and autonomous machine control are not established.",
      ur:
        "Adaptive Decision Lab ایک الگ offline اور synthetic decision-intelligence research module ہے۔ اس کا Phase 1.6.1 deterministic State Encoder test evidence کے ساتھ frozen ہے۔ Trained public agent، protected held-out validation اور autonomous machine control ابھی established نہیں ہیں۔"
    },

    {
      id: "evidence",
      keywords: [
        "evidence", "validation", "proof", "registry",
        "ایویڈنس", "ثبوت", "ویلیڈیشن", "رجسٹری"
      ],
      en:
        "E-ZERO separates computational observation, statistical evidence, software validation, and physical proof. Evidence status and limitations must remain visible, and unsupported claims must not be manufactured.",
      ur:
        "E-ZERO computational observation، statistical evidence، software validation اور physical proof کو الگ رکھتا ہے۔ Evidence status اور limitations واضح رہنی چاہئیں اور unsupported claims بنائے نہیں جاتے۔"
    },

    {
      id: "condition_status",
      keywords: [
        "red", "amber", "yellow", "green", "alarm", "condition status",
        "ریڈ", "لال", "امبر", "ییلو", "پیلا", "گرین", "سبز", "الارم"
      ],
      en:
        "Future registered condition interfaces may use Green for acceptable registered conditions, Amber for caution, and Red for high or critical registered risk. Missing, invalid, stale, unsupported, or contradictory data must not be shown as Green; it should use an Unknown or Review Required state.",
      ur:
        "Future registered condition interfaces میں Green acceptable registered condition، Amber caution، اور Red high یا critical registered risk کے لیے استعمال ہو سکتا ہے۔ Missing، invalid، stale، unsupported یا contradictory data کو Green نہیں دکھایا جائے گا بلکہ Unknown یا Review Required state دی جائے گی۔"
    },

    {
      id: "voice_guide",
      keywords: [
        "voice guide", "mic", "microphone", "speak", "assistant",
        "وائس گائیڈ", "مائک", "مائیک", "بول", "اسسٹنٹ"
      ],
      en:
        "E-ZERO Voice Guide is a read-only website guidance layer. It explains website sections, controls, evidence, results, and limitations. It does not control vehicles or machines and must say when verified information is unavailable.",
      ur:
        "E-ZERO Voice Guide ایک read-only website guidance layer ہے۔ یہ website کے sections، controls، evidence، results اور limitations سمجھاتا ہے۔ یہ گاڑی یا مشین کو control نہیں کرتا اور verified information نہ ہونے پر صاف بتاتا ہے۔"
    }
  ];

  const fallback = Object.freeze({
    en:
      "I do not have verified E-ZERO information for that question yet. Please use the registered website evidence or ask about a specific E-ZERO section.",
    ur:
      "میرے پاس اس سوال کے لیے ابھی verified E-ZERO information موجود نہیں ہے۔ براہِ کرم registered website evidence استعمال کریں یا E-ZERO کے کسی مخصوص section کے بارے میں پوچھیں۔"
  });

  window.EZERO_VOICE_GUIDE_KNOWLEDGE = Object.freeze({
    version: KNOWLEDGE_VERSION,
    entries: Object.freeze(entries),
    fallback: fallback
  });
})();
