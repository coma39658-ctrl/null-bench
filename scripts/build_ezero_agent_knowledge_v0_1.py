from pathlib import Path
import hashlib
import json
import re

ROOT = Path(".")
MANIFEST_PATH = ROOT / "data/ezero_agent_knowledge_manifest_v0_1.json"
OUTPUT_PATH = ROOT / "data/ezero_agent_knowledge_bundle_v0_1.json"

CHUNK_SIZE = 1400
CHUNK_OVERLAP = 180

manifest = json.loads(MANIFEST_PATH.read_text())

if manifest.get("rules", {}).get("read_only_retrieval") is not True:
    raise SystemExit("Manifest does not permit read-only retrieval")

if manifest.get("rules", {}).get("agent_may_edit_sources") is not False:
    raise SystemExit("Agent source write boundary is not locked")

sources_out = []
chunks_out = []

def sha256_text(raw_bytes):
    return hashlib.sha256(raw_bytes).hexdigest()

def normalize_text(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def make_chunks(text):
    if not text:
        return []

    chunks = []
    start = 0
    length = len(text)

    while start < length:
        end = min(length, start + CHUNK_SIZE)

        if end < length:
            boundary = max(
                text.rfind("\n\n", start, end),
                text.rfind(". ", start, end),
                text.rfind("۔", start, end)
            )

            if boundary > start + 500:
                end = boundary + 1

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= length:
            break

        start = max(end - CHUNK_OVERLAP, start + 1)

    return chunks

for source_index, source in enumerate(manifest["sources"], start=1):
    rel_path = source["path"]

    if "backup" in rel_path.lower():
        raise SystemExit("Backup file prohibited: " + rel_path)

    path = ROOT / rel_path

    if not path.is_file():
        raise SystemExit("Approved source missing: " + rel_path)

    raw = path.read_bytes()
    text = normalize_text(raw.decode("utf-8", errors="strict"))
    digest = sha256_text(raw)

    source_id = f"SRC-{source_index:03d}"

    source_record = {
        "source_id": source_id,
        "path": rel_path,
        "source_class": source["source_class"],
        "authority": source["authority"],
        "sha256": digest,
        "bytes": len(raw),
        "read_only": True
    }

    sources_out.append(source_record)

    for chunk_index, chunk in enumerate(make_chunks(text), start=1):
        chunks_out.append({
            "chunk_id": f"{source_id}-C{chunk_index:03d}",
            "source_id": source_id,
            "path": rel_path,
            "source_class": source["source_class"],
            "authority": source["authority"],
            "text": chunk
        })

bundle = {
    "bundle_version": "0.1",
    "status": "READ_ONLY_APPROVED_KNOWLEDGE",
    "manifest": str(MANIFEST_PATH),
    "rules": {
        "retrieval_only": True,
        "agent_may_modify_sources": False,
        "scientific_claims_require_evidence_support": True,
        "live_self_training": False
    },
    "source_count": len(sources_out),
    "chunk_count": len(chunks_out),
    "sources": sources_out,
    "chunks": chunks_out
}

OUTPUT_PATH.write_text(
    json.dumps(bundle, ensure_ascii=False, indent=2) + "\n"
)

print("EZERO_KNOWLEDGE_BUNDLE: BUILT")
print("SOURCES:", len(sources_out))
print("CHUNKS:", len(chunks_out))
print("READ_ONLY: TRUE")
print("LIVE_SELF_TRAINING: FALSE")
print("OUTPUT:", OUTPUT_PATH)
