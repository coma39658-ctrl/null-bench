#!/usr/bin/env python3
"""Build a minimal, isolated, PUBLIC test-only HTTPS static site.

Source is the PR staging branch, not the public GitHub Pages deployment.
Only the explicit call-page dependencies, its privacy page, icons and one CSS
background are published. No .git, repo docs, secrets, test logs or home site.
The Trusted Inbox is deliberately disabled for this different site origin:
its existing signed challenge uses the GitHub Pages origin. QR room signaling
and signed WebRTC are retained unchanged.
"""
from __future__ import annotations

import hashlib
import html
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist_ezero_secure_app_two_phone_staging"
CALL = "ezero_trusted_friends_staging_20261106.html"
PRIVACY = "ezero_secure_connect_privacy_v0_2.html"
ALLOWED_SUFFIXES = {".css", ".js", ".png", ".svg", ".webmanifest"}
ATTR = re.compile(r"""(?:src|href)\s*=\s*["'](\.{1,2}/[^"'<>]+)["']""", re.I)
CSS_URL = re.compile(r"""url\(\s*["']?([^)"']+)["']?\s*\)""", re.I)
SRC = re.compile(r"""(?:<script\b|<link\b)[^>]*?(?:src|href)=["'](\./[^"'<>]+)["']""", re.I)
fingerprint = os.environ.get("RENDER_GIT_COMMIT", "")
if not re.fullmatch(r"[a-fA-F0-9]{40}", fingerprint):
    proc = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True)
    fingerprint = proc.stdout.strip() if proc.returncode == 0 else "unknown"
short = fingerprint[:12]

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
seen: set[str] = set()

def local(raw: str, parent: Path) -> Path | None:
    value = html.unescape(raw).strip()
    if not value or value.startswith(("data:", "http:", "https:", "blob:", "#", "//")):
        return None
    clean = urlsplit(value).path
    if not clean.startswith(("./", "../")):
        return None
    resolved = (parent / clean).resolve()
    try:
        resolved.relative_to(ROOT)
    except ValueError as exc:
        raise RuntimeError("Unsafe static path outside repo") from exc
    return resolved

def put(path: Path) -> None:
    relative = path.relative_to(ROOT).as_posix()
    if relative in seen:
        return
    if path.suffix not in ALLOWED_SUFFIXES:
        raise RuntimeError("Disallowed static resource: " + relative)
    if not path.is_file():
        raise RuntimeError("Missing required static resource: " + relative)
    seen.add(relative)
    dest = OUT / relative
    dest.parent.mkdir(parents=True, exist_ok=True)
    data = path.read_bytes()
    if path.suffix == ".css":
        css = data.decode("utf-8")
        for raw in CSS_URL.findall(css):
            ref = local(raw, path.parent)
            if ref is not None:
                put(ref)
    if path.suffix == ".webmanifest":
        cfg = json.loads(data)
        cfg["name"] = "E-ZERO Secure App — STAGING TEST"
        cfg["short_name"] = "E-ZERO TEST"
        cfg["id"] = "./ezero-secure-app-staging-20261107"
        cfg["start_url"] = "./" + CALL
        cfg["scope"] = "./"
        for icon in cfg.get("icons", []):
            ref = local(icon.get("src", ""), path.parent)
            if ref is not None:
                put(ref)
        data = (json.dumps(cfg, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if relative == "js/ezero_trusted_inbox_stage_config_20261106.js":
        cfg = data.decode("utf-8")
        needle = "enabled:true"
        if cfg.count(needle) != 1:
            raise RuntimeError("Unexpected trusted-inbox configuration: fail closed")
        cfg = cfg.replace(needle, "enabled:false", 1)
        data = cfg.encode("utf-8")
    if relative == "js/ezero_auto_signaling_lab_config_20261106.js":
        # This preview uses a DIFFERENT Cloudflare Worker whose one allowed
        # WebSocket Origin is the Render HTTPS test hostname.
        current = data.decode("utf-8")
        old_ws = "wss://ezero-browser-signaling-pilot.coma39658.workers.dev"
        new_ws = "wss://ezero-browser-signaling-qr-inbox-20261112.coma39658.workers.dev"
        if current.count(old_ws) != 1:
            raise RuntimeError("Unexpected signaling Worker source: fail closed")
        data = current.replace(old_ws, new_ws, 1).encode("utf-8")
    dest.write_bytes(data)

def linked_documents(source: str, source_name: str) -> None:
    path = ROOT / source_name
    for raw in ATTR.findall(source):
        candidate = local(raw, path.parent)
        if candidate is not None and candidate.suffix in ALLOWED_SUFFIXES:
            put(candidate)

call_html = (ROOT / CALL).read_text(encoding="utf-8")
privacy_html = (ROOT / PRIVACY).read_text(encoding="utf-8")
linked_documents(call_html, CALL)
linked_documents(privacy_html, PRIVACY)

# Keep strict Origin isolation. Replace ONLY this copy's CSP allowlist,
# never relax the existing production GitHub Pages signaling policy.
old_ws = "wss://ezero-browser-signaling-pilot.coma39658.workers.dev"
new_ws = "wss://ezero-browser-signaling-qr-inbox-20261112.coma39658.workers.dev"
if call_html.count(old_ws) != 1:
    raise RuntimeError("Unexpected call-page CSP: fail closed")
call_html = call_html.replace(old_ws, new_ws, 1)

# Existing scripts and media engine are not changed; only the preview copies
# of navigation, page metadata and incompatible inbox configuration differ.
old_site_url = "https://coma39658-ctrl.github.io/null-bench/" + CALL
call_html = call_html.replace(old_site_url, "./" + CALL)
call_html = call_html.replace(
    "https://coma39658-ctrl.github.io/null-bench/icon-512.png", "./icon-512.png")
call_html = call_html.replace(
    'href="./ezero_secure_connect_preview_v0_1.html#qr"',
    'href="./' + CALL + '#ezeroProfileFirstGate"')
call_html = call_html.replace(
    '<link rel="manifest" href="./secure-connect-staging.webmanifest">',
    '<link rel="manifest" href="./secure-connect-staging.webmanifest">\n'
    '<link rel="stylesheet" href="./css/ezero_render_two_phone_stage_20261107.css">')
body = re.search(r"<body\b[^>]*>", call_html, re.I)
if not body:
    raise RuntimeError("Cannot find call page body")
notice = (
    '<aside class="ezero-stage-banner" role="note" aria-label="Staging test notice">'
    '<strong>🧪 E-ZERO Secure App — دو فونوں کے لیے ٹیسٹ ورژن</strong> '
    '<span>یہ عوامی پروڈکشن ورژن نہیں ہے۔ SHA: '
    + html.escape(short)
    + ' · QR کال آزمائیں؛ محفوظ دوست کا Cloudflare Inbox یہاں الگ origin کی وجہ سے بند ہے۔ '
    'نام اور تصویر صرف آپ کی اجازت کے بعد verified WebRTC رابطے پر شیئر ہوتی ہیں۔'
    '</span></aside>')
call_html = call_html[:body.end()] + "\n" + notice + call_html[body.end():]

# Isolated Render preview only: every build receives distinct JS/CSS URLs.
# A second phone must not silently reuse an older cached script/stylesheet
# when the HTML itself has changed. GitHub Pages assets stay untouched.
def asset_version(match: re.Match[str]) -> str:
    prefix, url = match.group(1), match.group(2)
    plain = url.split("?", 1)[0]
    if plain.startswith("./") and plain.endswith((".js", ".css")):
        return prefix + plain + "?build=" + short + '"'
    return match.group(0)
call_html = re.sub(r'((?:src|href)=")(\./[^"]+)"', asset_version, call_html)
(OUT / CALL).write_text(call_html, encoding="utf-8")

privacy_html = privacy_html.replace(
    'href="./ezero_secure_connect_live_p2p_v0_1.html"',
    'href="./' + CALL + '"')
privacy_html = privacy_html.replace(
    "<body>", '<body>\n<p class="ezero-privacy-stage">'
    '🧪 E-ZERO Secure App STAGING — آزمائشی ورژن؛ '
    'سگنلنگ سرور نیٹ ورک میٹاڈیٹا وصول کر سکتا ہے۔</p>', 1)
(OUT / PRIVACY).write_text(privacy_html, encoding="utf-8")

css = """
.ezero-stage-banner{position:relative;z-index:2;padding:12px 16px;margin:0 auto 8px;
background:#0f4937;color:#fff;border:2px solid #b89545;border-radius:10px;
font:600 14px/1.65 system-ui,sans-serif;max-width:1000px;text-align:center;}
.ezero-stage-banner strong{display:block;font-size:16px;color:#fff4c8;}
.ezero-stage-banner span{display:block;}
"""
(OUT / "css" / "ezero_render_two_phone_stage_20261107.css").write_text(css, encoding="utf-8")
seen.add("css/ezero_render_two_phone_stage_20261107.css")

landing = """<!doctype html><html lang="ur" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>E-ZERO Secure App — TEST ONLY</title></head>
<body style="background:#092b20;color:white;font:17px system-ui;padding:24px;line-height:1.8">
<main><h1>🧪 E-ZERO Secure App — آزمائشی سائٹ</h1>
<p>یہ مستقل عوامی ورژن نہیں ہے۔ اس کا مقصد دو حقیقی فونوں پر QR، آڈیو، ویڈیو اور پروفائل کا تجرباتی ٹیسٹ ہے۔</p>
<p><a style="color:#bde6b0" href="./ezero_trusted_friends_staging_20261106.html">دو موبائلوں کا ٹیسٹ صفحہ کھولیں</a></p>
<p><a style="color:#bde6b0" href="https://coma39658-ctrl.github.io/null-bench/">اصل E-ZERO مرکزی ویب سائٹ</a></p>
</main></body></html>"""
(OUT / "index.html").write_text(landing, encoding="utf-8")
(OUT / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")

# Preserve the Apache-2.0 legal notice when distributing the offline QR reader.
vendor_notice = ROOT / "js/vendor/LICENSE-jsQR-Apache-2.0.txt"
if not vendor_notice.is_file():
    raise RuntimeError("Bundled QR decoder license missing: fail closed")
license_dest = OUT / "licenses/jsQR-Apache-2.0.txt"
license_dest.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(vendor_notice, license_dest)

# A build must never publish source control or unrelated project materials.
result_files = [p for p in OUT.rglob("*") if p.is_file()]
if not result_files or any(p.name.startswith(".") for p in result_files):
    raise RuntimeError("Invalid staging publication")
if not (OUT / "js/ezero_trusted_stage_signaling_v0_1.js").is_file():
    raise RuntimeError("QR signaling missing")
if not (OUT / "js/ezero_profile_first_verified_friends_v0_1.js").is_file():
    raise RuntimeError("Profile gating missing")
if not (OUT / "secure-connect-staging.webmanifest").is_file():
    raise RuntimeError("Isolated manifest missing")
if "enabled:false" not in (OUT / "js/ezero_trusted_inbox_stage_config_20261106.js").read_text():
    raise RuntimeError("Production-origin inbox must be disabled on preview")
if "wss://ezero-browser-signaling-qr-inbox-20261112.coma39658.workers.dev" not in (OUT / "js/ezero_auto_signaling_lab_config_20261106.js").read_text():
    raise RuntimeError("New Render-origin staging signaling Worker not bound")
if "wss://ezero-browser-signaling-qr-inbox-20261112.coma39658.workers.dev" not in (OUT / CALL).read_text():
    raise RuntimeError("Render-origin WSS missing from preview Content Security Policy")
print(f"STAGING_STATIC_BUNDLE_PASS files={len(result_files)} commit={short}")
