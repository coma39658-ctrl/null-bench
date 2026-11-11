/* Isolated static safety gate. This is NOT a live authenticated handshake test. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=read('signaling/cloudflare/src/trusted_inbox_candidate_v0_1.js');
const client=read('js/ezero_trusted_friend_foreground_client_candidate_v0_1.js');
const config=JSON.parse(read('signaling/cloudflare/wrangler.trusted-render-test-20261111.jsonc'));
const stage=read('js/ezero_trusted_inbox_stage_config_20261106.js');
const origin='https://ezero-secure-app-two-phone-test-20261107.onrender.com';
const invite='/ezero_trusted_friends_staging_20261106.html';
test('Render origin and invite path are pinned identically',()=>{
  for(const source of [server,client]){
    assert.ok(source.includes('const ORIGIN="'+origin+'"'));
    assert.ok(source.includes('"'+invite+'"'));
    assert.ok(!source.includes('const ORIGIN="https://coma39658-ctrl.github.io"'));
  }
  assert.equal(config.vars.PUBLIC_ORIGIN,origin);
});
test('Dedicated DO binding and no automatic production deploy',()=>{
  assert.equal(config.name,'ezero-trusted-inbox-render-test');
  assert.equal(config.durable_objects.bindings[0].name,'TRUSTED_INBOXES');
  assert.equal(config.durable_objects.bindings[0].class_name,'TrustedInbox');
  assert.ok(!stage.includes('ezero-trusted-inbox-render-test'));
});
test('Signature challenge, trust, replay and explicit receipt safeguards exist',()=>{
  for(const token of ['crypto.subtle.verify','EZERO-TRUSTED-INBOX-1','not-trusted','REPLAY','COOLDOWN','delivered-to-active-tab','Origin','RECIPIENT_OFFLINE']){
    assert.ok(server.includes(token),'server missing '+token);
  }
  for(const token of ['crypto.subtle.sign','confirmIncomingVisible','FRESH_SIGNED_QR_INVITE_REQUIRED','FRIEND_NOT_VERIFIED_LOCALLY']){
    assert.ok(client.includes(token),'client missing '+token);
  }
});
test('Existing QR signaling remains a separate worker',()=>{
  const qr=read('js/ezero_auto_signaling_lab_config_20261106.js');
  assert.ok(!qr.includes('ezero-trusted-inbox-render-test'));
  assert.ok(!server.includes('SignalRoom'));
});
