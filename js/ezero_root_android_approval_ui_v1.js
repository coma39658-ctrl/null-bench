(() => {
  "use strict";
  const ORIGIN = "https://coma39658-ctrl.github.io";
  const REQUEST_TAG = "EZERO_ANDROID_ENROLL_REQUEST_V1";
  const APPROVAL_TAG = "EZERO_ANDROID_ENROLL_APPROVAL_V1";
  const ORDER = ["device_spki","device_fp","challenge_id","nonce","audience","expires_at","device_proof"];
  const $ = (id) => document.getElementById(id);
  let cameraStop = null;
  let pending = null;

  function decode64(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) throw new Error("BASE64URL_INVALID");
    const padded = value.replace(/-/g,"+").replace(/_/g,"/") + "=".repeat((4-value.length%4)%4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const canonical = btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    if (canonical !== value) throw new Error("BASE64URL_NON_CANONICAL");
    return bytes;
  }
  function to64(bytes) {
    let binary = "";
    for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  function parseEnvelope(raw, tag, keys) {
    if (typeof raw !== "string" || new TextEncoder().encode(raw).length > 4096 || !raw.endsWith("\n") || raw.includes("\r") || /[^\x20-\x7e\n]/.test(raw)) throw new Error("QR_SIZE_OR_TEXT_INVALID");
    const lines = raw.slice(0,-1).split("\n");
    if (lines.length !== keys.length+1 || lines[0] !== tag) throw new Error("QR_VERSION_INVALID");
    const values = {};
    keys.forEach((key,i) => {
      const line = lines[i+1];
      if (!line.startsWith(key+"=") || (line.match(/=/g)||[]).length !== 1) throw new Error("QR_FIELD_ORDER_OR_DUPLICATE_INVALID");
      const value = line.slice(key.length+1);
      if (!value) throw new Error("QR_FIELD_EMPTY");
      values[key] = value;
    });
    return values;
  }
  function canonicalChallenge(f) {
    return "EZERO_ANDROID_ENROLL_CHALLENGE_V1\n" +
      "challenge_id="+f.challenge_id+"\n" +
      "device_fp="+f.device_fp+"\n" +
      "nonce="+f.nonce+"\n" +
      "audience="+f.audience+"\n" +
      "expires_at="+f.expires_at+"\n";
  }
  async function verifyRequest(raw) {
    const f = parseEnvelope(raw, REQUEST_TAG, ORDER);
    if (!/^[a-f0-9]{64}$/.test(f.device_fp) ||
        !/^[A-Za-z0-9_-]{16,128}$/.test(f.challenge_id) ||
        !/^[A-Za-z0-9_-]{16,128}$/.test(f.nonce) ||
        f.audience !== ORIGIN || !/^[0-9]{13}$/.test(f.expires_at)) throw new Error("REQUEST_BINDING_INVALID");
    const expiry = Number(f.expires_at), now = Date.now();
    if (!Number.isSafeInteger(expiry) || expiry <= now || expiry > now+90000) throw new Error("CHALLENGE_EXPIRED");
    const spki = decode64(f.device_spki);
    if (spki.length < 80 || spki.length > 160) throw new Error("DEVICE_SPKI_SIZE_INVALID");
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", spki));
    const fp = Array.from(digest,b=>b.toString(16).padStart(2,"0")).join("");
    if (fp !== f.device_fp) throw new Error("DEVICE_FINGERPRINT_MISMATCH");
    const key = await crypto.subtle.importKey("spki", spki, {name:"ECDSA",namedCurve:"P-256"}, false, ["verify"]);
    const signature = decode64(f.device_proof);
    if (signature.length !== 64) throw new Error("DEVICE_PROOF_FORMAT_INVALID");
    const valid = await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"}, key, signature, new TextEncoder().encode(canonicalChallenge(f)));
    if (!valid) throw new Error("DEVICE_PROOF_INVALID");
    return f;
  }
  function assertCanonicalOrigin() {
    if (location.origin !== ORIGIN) throw new Error("NON_CANONICAL_ROOT_ORIGIN");
  }
  function stopCamera() {
    if (cameraStop) { cameraStop(); cameraStop = null; }
    $("camera").hidden = true;
  }
  function setStatus(message, bad=false) {
    $("status").textContent = message;
    $("status").dataset.state = bad ? "error" : "info";
  }
  async function acceptRequest(raw) {
    stopCamera();
    $("approval").hidden = true;
    $("approve").disabled = true;
    $("consent").checked = false;
    pending = null;
    try {
      assertCanonicalOrigin();
      const f = await verifyRequest(raw);
      const identity = await globalThis.EZERO_CONNECT_IDENTITY.load();
      if (!identity) throw new Error("ROOT_IDENTITY_NOT_FOUND_ON_THIS_ORIGIN");
      const root = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
      const rootFp = root.fingerprint.replaceAll(":","").toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(rootFp)) throw new Error("ROOT_FINGERPRINT_INVALID");
      pending = f;
      $("deviceFp").textContent = f.device_fp;
      $("challengeId").textContent = f.challenge_id;
      $("expiry").textContent = new Date(Number(f.expires_at)).toLocaleString();
      $("rootFp").textContent = rootFp;
      $("requestDetails").hidden = false;
      $("approve").disabled = false;
      setStatus("درخواست درست ہے۔ ڈیوائس کی شناخت اور fingerprint دیکھ کر ہی منظوری دیں۔ ابھی کوئی دستخط نہیں ہوا۔");
    } catch (e) {
      setStatus("درخواست مسترد: "+String(e.message||e)+"۔ کوئی منظوری جاری نہیں ہوئی۔", true);
    }
  }
  $("startCamera").addEventListener("click", async () => {
    try {
      if (!globalThis.EZERO_QR?.startCamera) throw new Error("QR_RUNTIME_NOT_BUILT_OR_LOADED");
      $("camera").hidden = false;
      cameraStop = await globalThis.EZERO_QR.startCamera($("video"), acceptRequest);
      setStatus("کیمرہ فعال ہے۔ Android درخواست QR اسکین کریں۔");
    } catch(e) { stopCamera(); setStatus("کیمرہ شروع نہیں ہوا: "+String(e.message||e), true); }
  });
  $("stopCamera").addEventListener("click", () => { stopCamera(); setStatus("کیمرہ بند ہے۔"); });
  $("requestFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!globalThis.EZERO_QR?.decodeImageFile) throw new Error("QR_RUNTIME_NOT_BUILT_OR_LOADED");
      const raw = await globalThis.EZERO_QR.decodeImageFile(file);
      await acceptRequest(raw);
    } catch(e) { setStatus("QR تصویر پڑھی نہیں جا سکی: "+String(e.message||e), true); }
    finally { event.target.value = ""; }
  });
  $("approve").addEventListener("click", async () => {
    try { assertCanonicalOrigin(); }
    catch (e) { setStatus("منظوری روک دی گئی: "+String(e.message||e), true); return; }
    if (!pending || !$("consent").checked) { setStatus("منظوری کے لیے واضح تصدیق ضروری ہے۔", true); return; }
    $("approve").disabled = true;
    try {
      const identity = await globalThis.EZERO_CONNECT_IDENTITY.load();
      if (!identity) throw new Error("ROOT_IDENTITY_NOT_FOUND");
      const root = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
      const rootFp = root.fingerprint.replaceAll(":","").toLowerCase();
      const challenge = {
        root_fp: rootFp,
        device_fp: pending.device_fp,
        challenge_id: pending.challenge_id,
        nonce: pending.nonce,
        audience: pending.audience,
        expires_at: pending.expires_at
      };
      const signed = await globalThis.EZERO_CONNECT_ROOT_SIGNER_V1.signAndroidRootApproval(challenge);
      if (signed.root_fp !== rootFp) throw new Error("ROOT_SIGNER_FINGERPRINT_MISMATCH");
      if (Date.now() >= Number(pending.expires_at)) throw new Error("CHALLENGE_EXPIRED_BEFORE_SIGNING");
      const approval = APPROVAL_TAG+"\n"+
        "root_fp="+rootFp+"\n"+
        "device_fp="+pending.device_fp+"\n"+
        "challenge_id="+pending.challenge_id+"\n"+
        "nonce="+pending.nonce+"\n"+
        "audience="+pending.audience+"\n"+
        "expires_at="+pending.expires_at+"\n"+
        "root_approval="+signed.signature+"\n";
      if (!globalThis.EZERO_QR?.encodeDataUrl) throw new Error("QR_RUNTIME_NOT_BUILT_OR_LOADED");
      $("approvalImage").src = globalThis.EZERO_QR.encodeDataUrl(approval);
      $("approvalText").value = approval;
      $("approval").hidden = false;
      setStatus("منظوری کا QR تیار ہے۔ یہ صرف Root کے دستخط شدہ approval token ہے؛ Worker enrollment ابھی نہیں ہوا۔");
    } catch(e) {
      setStatus("منظوری تیار نہیں ہوئی: "+String(e.message||e), true);
      $("approve").disabled = false;
    }
  });
  $("copyApproval").addEventListener("click", async () => {
    if (!$("approvalText").value) return;
    try { await navigator.clipboard.writeText($("approvalText").value); setStatus("منظوری کا عوامی QR متن کاپی ہو گیا۔"); }
    catch(_) { $("approvalText").focus(); $("approvalText").select(); setStatus("متن منتخب ہے؛ دستی طور پر کاپی کریں۔"); }
  });
  if (location.origin !== ORIGIN) setStatus("غلط ویب سائٹ origin۔ Root منظوری صرف canonical E-ZERO origin پر دستیاب ہے۔", true);
  else if (!globalThis.isSecureContext || !globalThis.EZERO_CONNECT_IDENTITY || !globalThis.EZERO_CONNECT_ROOT_SIGNER_V1) setStatus("محفوظ Root شناخت یا signer دستیاب نہیں۔ کوئی نئی کلید نہیں بنائی جائے گی۔", true);
  else setStatus("Root approval staging تیار ہے۔ پہلے موجودہ Root شناخت لوڈ کریں؛ نئی Root کلید خودکار نہیں بنائی جائے گی۔");
})();
