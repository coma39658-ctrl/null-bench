import json
import math
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

REGISTRY = Path("data/evidence_registry.json")

REQUIRED_TOP_LEVEL = {
    "schema_version",
    "registry_name",
    "last_verified",
    "principle",
    "modules",
}

REQUIRED_MODULE_FIELDS = {
    "module_id",
    "display_name",
    "status",
    "scope",
    "evidence_status",
    "evidence_reference",
    "what_this_means",
    "limitations",
    "public_use",
}

ALLOWED_STATUSES = {
    "PUBLIC_TOOL",
    "CLOSED_FROZEN",
    "DEVELOPMENT",
    "EXPERIMENTAL",
}

ALLOWED_EVIDENCE_STATUSES = {
    "PASS",
    "FAIL",
    "CONDITIONAL",
    "PARTIAL",
    "COMPUTATIONAL_STATISTICAL_TOOL",
}


def fail(message, errors):
    errors.append(message)


def warn(message, warnings):
    warnings.append(message)


def valid_http_url(value):
    try:
        parsed = urlparse(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False


def validate_metric(module_id, key, value, errors):
    prefix = f"{module_id}.metrics.{key}"

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        fail(f"{prefix}: metric must be numeric.", errors)
        return

    if not math.isfinite(float(value)):
        fail(f"{prefix}: metric must be finite.", errors)
        return

    if value < 0:
        fail(f"{prefix}: metric cannot be negative.", errors)

    key_lower = key.lower()

    if "percent" in key_lower and not 0 <= value <= 100:
        fail(
            f"{prefix}: percentage must be between 0 and 100.",
            errors,
        )

    if key_lower.endswith("_pp") and not 0 <= value <= 100:
        fail(
            f"{prefix}: percentage-point value must be between 0 and 100.",
            errors,
        )


def main():
    errors = []
    warnings = []

    if not REGISTRY.exists():
        print(f"FAIL: Registry not found: {REGISTRY}")
        return 1

    try:
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"FAIL: Invalid JSON: {exc}")
        return 1

    missing = REQUIRED_TOP_LEVEL - set(data)

    if missing:
        fail(
            "Missing top-level fields: " + ", ".join(sorted(missing)),
            errors,
        )

    try:
        date.fromisoformat(str(data.get("last_verified", "")))
    except ValueError:
        fail("last_verified must use ISO YYYY-MM-DD format.", errors)

    if data.get("principle") != "Scientific claims are data, not UI text.":
        fail(
            "Registry principle must remain: "
            "'Scientific claims are data, not UI text.'",
            errors,
        )

    modules = data.get("modules")

    if not isinstance(modules, list):
        fail("'modules' must be a list.", errors)
        modules = []

    if not modules:
        fail("Registry must contain at least one module.", errors)

    seen_ids = set()

    for index, module in enumerate(modules, start=1):
        prefix = f"Module #{index}"

        if not isinstance(module, dict):
            fail(f"{prefix}: entry must be an object.", errors)
            continue

        missing_fields = REQUIRED_MODULE_FIELDS - set(module)

        if missing_fields:
            fail(
                f"{prefix}: missing fields: "
                + ", ".join(sorted(missing_fields)),
                errors,
            )

        module_id = module.get("module_id")

        if not isinstance(module_id, str) or not module_id.strip():
            fail(f"{prefix}: invalid module_id.", errors)
            module_id = f"module_{index}"
        elif module_id in seen_ids:
            fail(f"{prefix}: duplicate module_id '{module_id}'.", errors)
        else:
            seen_ids.add(module_id)

        status = str(module.get("status", "")).strip()

        if status not in ALLOWED_STATUSES:
            fail(
                f"{module_id}: unsupported status '{status}'.",
                errors,
            )

        evidence_status = str(
            module.get("evidence_status", "")
        ).strip()

        if evidence_status not in ALLOWED_EVIDENCE_STATUSES:
            fail(
                f"{module_id}: unsupported evidence_status "
                f"'{evidence_status}'.",
                errors,
            )

        scope = str(module.get("scope", "")).strip()
        if not scope:
            fail(f"{module_id}: scope cannot be empty.", errors)

        meaning = str(module.get("what_this_means", "")).strip()
        if not meaning:
            fail(
                f"{module_id}: what_this_means cannot be empty.",
                errors,
            )

        limitations = module.get("limitations")

        if not isinstance(limitations, list) or not limitations:
            fail(
                f"{module_id}: limitations must be a non-empty list.",
                errors,
            )

        refs = module.get("evidence_reference")

        if not isinstance(refs, dict) or not refs:
            fail(
                f"{module_id}: evidence_reference must be a non-empty object.",
                errors,
            )
            refs = {}

        if status == "CLOSED_FROZEN":
            if not any(
                key in refs
                for key in {
                    "tag",
                    "closed_tag",
                    "commit",
                    "closure_commit",
                }
            ):
                fail(
                    f"{module_id}: CLOSED_FROZEN requires "
                    "a commit or frozen tag reference.",
                    errors,
                )

        public_use = module.get("public_use")

        if not isinstance(public_use, bool):
            fail(
                f"{module_id}: public_use must be true or false.",
                errors,
            )

        if public_use:
            public_url = module.get("public_url")
            if not isinstance(public_url, str) or not valid_http_url(public_url):
                fail(
                    f"{module_id}: public_use=true requires "
                    "a valid public_url.",
                    errors,
                )

        metrics = module.get("metrics")

        if metrics is not None:
            if not isinstance(metrics, dict):
                fail(f"{module_id}: metrics must be an object.", errors)
            else:
                for key, value in metrics.items():
                    validate_metric(module_id, key, value, errors)

        combined_text = " ".join(
            [
                meaning,
                *(
                    limitations
                    if isinstance(limitations, list)
                    else []
                ),
            ]
        ).lower()

        if evidence_status == "FAIL" and "fail" not in combined_text:
            fail(
                f"{module_id}: FAIL evidence must explicitly "
                "state the failure in meaning or limitations.",
                errors,
            )

        if evidence_status == "PASS":
            for phrase in {
                "universal proof",
                "proves universally",
                "guaranteed safe",
                "physical proof",
            }:
                if phrase in combined_text:
                    fail(
                        f"{module_id}: PASS evidence contains "
                        f"forbidden overclaim '{phrase}'.",
                        errors,
                    )

        if status == "CLOSED_FROZEN" and evidence_status == "PARTIAL":
            warn(
                f"{module_id}: CLOSED_FROZEN evidence is PARTIAL; "
                "limitations must explain coverage.",
                warnings,
            )

    print("=" * 70)
    print("E-ZERO EVIDENCE REGISTRY VALIDATOR")
    print("=" * 70)
    print(f"Registry : {REGISTRY}")
    print(f"Modules  : {len(modules)}")
    print(f"Errors   : {len(errors)}")
    print(f"Warnings : {len(warnings)}")

    if warnings:
        print("\nWARNINGS:")
        for warning in warnings:
            print(f"- {warning}")

    if errors:
        print("\nERRORS:")
        for error in errors:
            print(f"- {error}")
        print("\nVALIDATION RESULT: FAIL")
        return 1

    print("\nVALIDATION RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
