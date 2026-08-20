import json
import sys
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


def fail(message, errors):
    errors.append(message)


def valid_http_url(value):
    try:
        parsed = urlparse(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False


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
        elif module_id in seen_ids:
            fail(f"{prefix}: duplicate module_id '{module_id}'.", errors)
        else:
            seen_ids.add(module_id)

        limitations = module.get("limitations")

        if not isinstance(limitations, list) or not limitations:
            fail(
                f"{prefix}: limitations must be a non-empty list.",
                errors,
            )

        evidence_reference = module.get("evidence_reference")

        if not isinstance(evidence_reference, dict) or not evidence_reference:
            fail(
                f"{prefix}: evidence_reference must be a non-empty object.",
                errors,
            )

        public_use = module.get("public_use")

        if not isinstance(public_use, bool):
            fail(
                f"{prefix}: public_use must be true or false.",
                errors,
            )

        if public_use:
            public_url = module.get("public_url")

            if not isinstance(public_url, str) or not valid_http_url(public_url):
                fail(
                    f"{prefix}: public_use=true requires a valid public_url.",
                    errors,
                )

        status = str(module.get("status", "")).strip()

        if not status:
            fail(f"{prefix}: status cannot be empty.", errors)

        scope = str(module.get("scope", "")).strip()

        if not scope:
            fail(f"{prefix}: scope cannot be empty.", errors)

        meaning = str(module.get("what_this_means", "")).strip()

        if not meaning:
            fail(
                f"{prefix}: what_this_means cannot be empty.",
                errors,
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
