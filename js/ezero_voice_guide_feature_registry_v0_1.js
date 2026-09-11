(function () {
  "use strict";

  const FEATURE_REGISTRY_VERSION = "ezero-voice-guide-feature-registry-v0.1";

  const features = [
    {
      id: "null_bench",
      section_id: "try",
      title_en: "Null Bench",
      title_ur: "نَل بینچ",
      role: "degree_preserving_null_model_testing",
      keywords: [
        "null bench", "network test", "degree preserving",
        "نل بینچ", "نیٹ ورک ٹیسٹ"
      ],
      explanation_en:
        "Null Bench compares an observed network with degree-preserving randomized networks to test whether the observed structure stands out from the null distribution.",
      explanation_ur:
        "Null Bench اصل نیٹ ورک کو degree-preserving randomized networks کے ساتھ compare کرتا ہے تاکہ دیکھا جا سکے کہ observed structure null distribution سے واقعی نمایاں ہے یا نہیں۔",
      authority: "COMPUTATIONAL_STATISTICAL_TOOL",
      physical_claim: false,
      diagnostic_claim: false
    },

    {
      id: "benchmark006c",
      section_id: "benchmark006c",
      title_en: "Benchmark 006-C",
      title_ur: "بینچ مارک 006-C",
      role: "public_synthetic_browser_benchmark",
      keywords: [
        "006c", "006-c", "benchmark 006",
        "synthetic benchmark", "بینچ مارک"
      ],
      explanation_en:
        "Benchmark 006-C is a public synthetic browser benchmark. Its runs are exploratory computational outputs and are not independent GSRL, physical, real-sensor, diagnostic, safety, or HIL validation.",
      explanation_ur:
        "Benchmark 006-C ایک public synthetic browser benchmark ہے۔ اس کے runs exploratory computational outputs ہیں؛ یہ independent GSRL، physical، real-sensor، diagnostic، safety یا HIL validation نہیں ہیں۔",
      authority: "SYNTHETIC_COMPUTATIONAL",
      physical_claim: false,
      diagnostic_claim: false
    },

    {
      id: "vehicle_obd",
      section_id: "vehicle-obd",
      title_en: "Vehicle / OBD",
      title_ur: "وہیکل / OBD",
      role: "read_only_vehicle_data_interface",
      keywords: [
        "vehicle", "obd", "car", "engine data",
        "گاڑی", "او بی ڈی", "انجن ڈیٹا"
      ],
      explanation_en:
        "The Vehicle / OBD layer is designed for read-only vehicle data handling and registered status reporting. It does not provide unsupported definitive diagnosis or autonomous vehicle control.",
      explanation_ur:
        "Vehicle / OBD layer read-only گاڑی کے data اور registered status reporting کے لیے ہے۔ یہ unsupported definitive diagnosis یا autonomous vehicle control نہیں کرتا۔",
      authority: "READ_ONLY_DATA_INTERFACE",
      physical_claim: false,
      diagnostic_claim: false
    },

    {
      id: "industrial_intelligence",
      section_id: "industrial-intelligence",
      title_en: "Industrial Intelligence",
      title_ur: "انڈسٹریل انٹیلیجنس",
      role: "industrial_condition_monitoring",
      keywords: [
        "industrial", "machine", "factory", "machinery",
        "مشین", "فیکٹری", "انڈسٹریل"
      ],
      explanation_en:
        "Industrial Intelligence is the E-ZERO condition-monitoring direction for industrial machinery. Result interpretation must remain within validated data, registered thresholds, and evidence boundaries.",
      explanation_ur:
        "Industrial Intelligence صنعتی مشینری کی condition monitoring کے لیے E-ZERO کی direction ہے۔ Result interpretation صرف validated data، registered thresholds اور evidence boundaries کے اندر رہنی چاہیے۔",
      authority: "CONDITION_MONITORING",
      physical_claim: false,
      diagnostic_claim: false
    },

    {
      id: "fleet_shared_access",
      section_id: "fleet-shared-access",
      title_en: "Fleet / Shared Access",
      title_ur: "فلیٹ / شیئرڈ ایکسس",
      role: "fleet_information_and_access_layer",
      keywords: [
        "fleet", "shared access", "vehicles",
        "فلیٹ", "شیئرڈ ایکسس"
      ],
      explanation_en:
        "Fleet / Shared Access organizes fleet-oriented information and shared access functions without changing the scientific authority of the underlying E-ZERO modules.",
      explanation_ur:
        "Fleet / Shared Access فلیٹ سے متعلق information اور shared access functions کو organize کرتا ہے، مگر underlying E-ZERO modules کی scientific authority نہیں بدلتا۔",
      authority: "PRESENTATION_ACCESS_LAYER",
      physical_claim: false,
      diagnostic_claim: false
    },

    {
      id: "evidence_governance",
      section_id: "evidence",
      title_en: "Evidence Governance",
      title_ur: "ایویڈنس گورننس",
      role: "evidence_registry_and_validation",
      keywords: [
        "evidence", "validation", "pass", "fail",
        "ثبوت", "ویلیڈیشن", "پاس", "فیل"
      ],
      explanation_en:
        "Evidence Governance records module status, provenance, validation boundaries, limitations, and evidence references. Scientific claims must come from registered evidence rather than UI wording.",
      explanation_ur:
        "Evidence Governance module status، provenance، validation boundaries، limitations اور evidence references محفوظ کرتا ہے۔ Scientific claims UI text سے نہیں بلکہ registered evidence سے آنی چاہئیں۔",
      authority: "EVIDENCE_AUTHORITY",
      physical_claim: false,
      diagnostic_claim: false
    },

    {
      id: "adaptive_decision_lab",
      section_id: "adaptive-decision-lab",
      title_en: "Adaptive Decision Lab",
      title_ur: "اڈاپٹو ڈیسیژن لیب",
      role: "offline_synthetic_decision_research",
      keywords: [
        "adaptive decision", "decision lab", "learning agent", "q learning",
        "اڈاپٹو", "ڈیسیژن لیب", "کیو لرننگ"
      ],
      explanation_en:
        "The Adaptive Decision Lab is a separate offline and synthetic decision-learning research module. The deterministic Safety Shield remains final authority. No autonomous real-machine control is established.",
      explanation_ur:
        "Adaptive Decision Lab ایک الگ offline اور synthetic decision-learning research module ہے۔ Deterministic Safety Shield آخری authority ہے۔ حقیقی مشین کا autonomous control ثابت یا فعال نہیں ہے۔",
      authority: "EXPERIMENTAL_OFFLINE_RESEARCH",
      physical_claim: false,
      diagnostic_claim: false
    },

    {
      id: "voice_guide",
      section_id: null,
      title_en: "E-ZERO Voice Guide",
      title_ur: "ای زیرو وائس گائیڈ",
      role: "informational_support",
      keywords: [
        "voice guide", "assistant", "help", "mic",
        "وائس گائیڈ", "مدد", "مائک", "اردو"
      ],
      explanation_en:
        "The E-ZERO Voice Guide explains registered website features, statuses, results, errors, and limitations. It is an informational support layer and not scientific or diagnostic authority.",
      explanation_ur:
        "E-ZERO Voice Guide registered website features، statuses، results، errors اور limitations سمجھاتا ہے۔ یہ informational support layer ہے، scientific یا diagnostic authority نہیں۔",
      authority: "INFORMATIONAL_SUPPORT",
      physical_claim: false,
      diagnostic_claim: false
    }
  ];

  const controls = [
    {
      id: "languageSelect",
      type: "select",
      purpose_en: "Changes the website display language where translations are available.",
      purpose_ur: "جہاں translation موجود ہو وہاں website کی زبان بدلتا ہے۔"
    },
    {
      id: "ezeroVoiceGuideButton",
      type: "button",
      purpose_en: "Opens the E-ZERO Voice Guide.",
      purpose_ur: "E-ZERO Voice Guide کھولتا ہے۔"
    },
    {
      id: "ezeroVoiceGuideAsk",
      type: "button",
      purpose_en: "Submits the typed question to the verified guide.",
      purpose_ur: "لکھا ہوا سوال verified guide کو بھیجتا ہے۔"
    },
    {
      id: "ezeroVoiceGuideMic",
      type: "button",
      purpose_en: "Starts browser speech recognition when supported.",
      purpose_ur: "Browser support ہونے پر آواز سے سوال سننے کی کوشش کرتا ہے۔"
    },
    {
      id: "ezeroVoiceGuideSpeak",
      type: "button",
      purpose_en: "Speaks the current guide answer using browser speech synthesis when supported.",
      purpose_ur: "Browser support ہونے پر موجودہ جواب آواز میں سناتا ہے۔"
    }
  ];

  window.EZERO_VOICE_GUIDE_FEATURE_REGISTRY = Object.freeze({
    version: FEATURE_REGISTRY_VERSION,
    features: Object.freeze(features),
    controls: Object.freeze(controls)
  });
})();
