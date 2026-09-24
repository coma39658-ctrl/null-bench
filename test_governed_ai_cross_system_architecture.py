import unittest
from pathlib import Path


SPEC = Path("docs/EZERO_GOVERNED_AI_CROSS_SYSTEM_ARCHITECTURE_V0_1.md")


class GovernedAICrossSystemArchitectureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = SPEC.read_text(encoding="utf-8")

    def test_spec_is_present_and_draft(self):
        self.assertTrue(SPEC.exists())
        self.assertIn("Status: DRAFT — NOT FROZEN", self.text)
        self.assertIn("## 29. Freeze Boundary", self.text)

    def test_authority_separation(self):
        for phrase in (
            "AI is not:",
            "- scientific authority",
            "- evidence authority",
            "- identity authority",
            "- authorization authority",
            "- safety authority",
            "- physical control authority",
        ):
            self.assertIn(phrase, self.text)

    def test_source_classes_are_separated(self):
        for source_class in (
            "EZERO_VERIFIED_KNOWLEDGE",
            "REAL_OBD",
            "SIMULATED",
            "IMAGE_OBSERVATION",
            "EXTERNAL_CURRENT_SOURCE",
            "GENERAL_KNOWLEDGE",
            "AI_INFERENCE",
            "FAIL_CLOSED",
        ):
            self.assertIn(source_class, self.text)

    def test_automotive_intelligence_scope_exists(self):
        for phrase in (
            "vehicle knowledge",
            "troubleshooting guidance",
            "DTC explanation",
            "spare-parts information",
            "part-identification assistance",
            "workshop assistance",
        ):
            self.assertIn(phrase, self.text)

    def test_image_observation_cannot_become_real_obd(self):
        self.assertIn(
            "Image-derived observations must remain classified as image observations unless independently verified.",
            self.text,
        )
        self.assertIn(
            "An image observation must never automatically become:",
            self.text,
        )
        self.assertIn("- REAL_OBD", self.text)

    def test_price_and_market_information_require_sources(self):
        self.assertIn(
            "Prices may be provided only from an appropriate current source",
            self.text,
        )
        self.assertIn(
            "The AI must not invent current prices.",
            self.text,
        )
        self.assertIn(
            "Market estimates must be presented as estimates or observed market ranges",
            self.text,
        )

    def test_obd_boundary_is_preserved(self):
        self.assertIn("When REAL_OBD evidence is available:", self.text)
        for phrase in (
            "AI must not:",
            "alter raw OBD evidence",
            "alter provenance",
            "fabricate sensor readings",
            "convert screening into confirmed diagnosis",
            "authorize physical OBD execution",
        ):
            self.assertIn(phrase, self.text)

    def test_personal_workshop_fleet_boundaries(self):
        self.assertIn("PERSONAL", self.text)
        self.assertIn("WORKSHOP", self.text)
        self.assertIn("FUTURE_FLEET", self.text)
        self.assertIn(
            "Fleet implementation remains outside current Vehicle V0.1 scope",
            self.text,
        )

    def test_voice_is_presentation_only(self):
        self.assertIn("Voice is a presentation channel.", self.text)
        self.assertIn(
            "Voice must not create authority",
            self.text,
        )

    def test_conversation_memory_is_bounded(self):
        self.assertIn(
            "Conversation context is session-scoped by default.",
            self.text,
        )
        self.assertIn(
            "Conversation memory must not silently become permanent personal memory.",
            self.text,
        )

    def test_ai_cannot_change_governed_systems(self):
        for phrase in (
            "AI must never autonomously:",
            "change safety rules",
            "change authorization policy",
            "deploy production changes",
        ):
            self.assertIn(phrase, self.text)

    def test_promotion_gate_exists(self):
        for phrase in (
            "source review",
            "privacy review",
            "evidence-boundary review",
            "offline tests",
            "regression tests",
            "safety tests",
            "evidence validation",
            "human approval",
            "staged deployment",
            "rollback readiness",
        ):
            self.assertIn(phrase, self.text)

    def test_acceptance_criteria_are_present(self):
        self.assertIn(
            "## 28.1 Cross-System AI Acceptance Criteria",
            self.text,
        )
        self.assertEqual(self.text.count("## 28.1 Cross-System AI Acceptance Criteria"), 1)
        self.assertIn(
            "15. New AI modules integrate through governed context adapters",
            self.text,
        )
        self.assertIn(
            "16. AI cannot alter frozen specifications, raw evidence, safety rules, or authorization policy.",
            self.text,
        )
        self.assertIn(
            "18. New AI capabilities require source, privacy, evidence, offline, regression, safety, validation, and human-approval gates.",
            self.text,
        )

    def test_freeze_boundary_is_last_major_section(self):
        freeze_pos = self.text.index("## 29. Freeze Boundary")
        acceptance_pos = self.text.index("## 28.1 Cross-System AI Acceptance Criteria")
        self.assertGreater(freeze_pos, acceptance_pos)
        self.assertTrue(self.text.rstrip().endswith(
            "This document remains DRAFT until reviewed for consistency with all relevant frozen E-ZERO architectures and explicitly frozen."
        ))


if __name__ == "__main__":
    unittest.main()
