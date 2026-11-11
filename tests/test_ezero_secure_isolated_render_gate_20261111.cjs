'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
test('Render build disables unverified production-origin trusted inbox', () => {
  const src=read('scripts/build_ezero_secure_app_render_staging_20261107.py');
  assert.match(src,/cfg\.replace\("enabled:true", "enabled:false", 1\)/);
  assert.match(src,/Unexpected trusted-inbox configuration: fail closed/);
});
test('Render QR signaling uses separate staging Worker', () => {
  const src=read('signaling/cloudflare/wrangler.render-two-phone-test-20261107.jsonc');
  assert.match(src,/"name": "ezero-browser-signaling-render-test"/);
  assert.match(src,/"PUBLIC_ORIGIN": "https:\/\/ezero-secure-app-two-phone-test-20261107\.onrender\.com"/);
});
test('Production-origin trusted inbox remains separate from Render preview', () => {
  const client=read('js/ezero_trusted_friend_foreground_client_candidate_v0_1.js');
  assert.match(client,/const ORIGIN="https:\/\/coma39658-ctrl\.github\.io"/);
  assert.match(client,/location\.origin===ORIGIN/);
});
