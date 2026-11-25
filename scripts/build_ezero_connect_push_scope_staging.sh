#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-dist}"
if [[ "$OUT_DIR" == "/" || "$OUT_DIR" == "." || "$OUT_DIR" == ".." ]]; then
  echo "Refusing unsafe publish directory: $OUT_DIR" >&2
  exit 2
fi

rm -rf -- "$OUT_DIR"
mkdir -p "$OUT_DIR/js"
cp ezero-connect-app.html "$OUT_DIR/index.html"
cp ezero-connect.html ezero-connect.webmanifest icon-192.png icon-512.png "$OUT_DIR/"
cp -R js/. "$OUT_DIR/js/"
cp staging/ezero-connect-push-scope/service-worker.js "$OUT_DIR/service-worker.js"

test -s "$OUT_DIR/index.html"
test -s "$OUT_DIR/service-worker.js"
test -s "$OUT_DIR/js/ezero_push_contract_v1.js"
test -s "$OUT_DIR/ezero-connect.webmanifest"
echo "E-ZERO Connect isolated-origin static bundle ready: $OUT_DIR"
