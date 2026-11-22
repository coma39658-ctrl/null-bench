(() => {
  "use strict";
  const DB = "ezero-connect-local-profile-v1";
  const STORE = "profile";
  const KEYS = "keys";
  const KEY_ID = "device-profile-aes-gcm";
  const MAX_IMAGE_BYTES = 180 * 1024;
  const $ = id => document.getElementById(id);
  let current = { displayName: "", avatarDataUrl: "" };
  let pendingAvatar = "";
  let removeAvatar = false;

  function openDb() {
    if (!globalThis.indexedDB || !globalThis.crypto?.subtle || !globalThis.isSecureContext) {
      throw new Error("PROFILE_SECURE_STORAGE_UNAVAILABLE");
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(KEYS)) db.createObjectStore(KEYS, { keyPath: "id" });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(new Error("PROFILE_DATABASE_OPEN_FAILED"));
    });
  }
  async function getKey(create) {
    const db = await openDb();
    const found = await new Promise((resolve, reject) => {
      const req = db.transaction(KEYS, "readonly").objectStore(KEYS).get(KEY_ID);
      req.onsuccess = () => resolve(req.result?.key || null);
      req.onerror = () => reject(new Error("PROFILE_KEY_READ_FAILED"));
    });
    if (found || !create) { db.close(); return found; }
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(KEYS, "readwrite");
      tx.objectStore(KEYS).put({ id: KEY_ID, key });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error("PROFILE_KEY_WRITE_FAILED"));
      tx.onabort = () => reject(new Error("PROFILE_KEY_WRITE_ABORTED"));
    });
    db.close();
    return key;
  }
  function transaction(store, mode, action) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = action(tx.objectStore(store));
      tx.oncomplete = () => { db.close(); resolve(req?.result); };
      tx.onerror = () => { db.close(); reject(new Error("PROFILE_STORAGE_FAILED")); };
      tx.onabort = () => { db.close(); reject(new Error("PROFILE_STORAGE_ABORTED")); };
      if (req) req.onerror = () => reject(new Error("PROFILE_STORAGE_REQUEST_FAILED"));
    }));
  }
  async function load() {
    const record = await transaction(STORE, "readonly", store => store.get("primary"));
    if (!record) return current;
    const key = await getKey(false);
    if (!key || key.extractable !== false || key.algorithm?.name !== "AES-GCM") {
      throw new Error("PROFILE_KEY_MISSING_OR_INVALID");
    }
    const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(record.iv) }, key, new Uint8Array(record.ciphertext));
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(clear));
    if (typeof value.displayName !== "string" || typeof value.avatarDataUrl !== "string") throw new Error("PROFILE_RECORD_INVALID");
    current = value;
    render();
    return { ...current };
  }
  async function save(displayName, avatarDataUrl) {
    const name = String(displayName || "").trim();
    if (!name || name.length > 48 || /[\u0000-\u001F\u007F]/.test(name)) throw new Error("PROFILE_NAME_INVALID");
    const avatar = String(avatarDataUrl || "");
    if (avatar && (!/^data:image\/(?:jpeg|png|webp);base64,/.test(avatar) || avatar.length > 260000)) {
      throw new Error("PROFILE_AVATAR_INVALID");
    }
    const value = { v: 1, displayName: name, avatarDataUrl: avatar, updatedAt: new Date().toISOString() };
    const key = await getKey(true);
    if (key.extractable !== false) throw new Error("PROFILE_KEY_MUST_BE_NON_EXTRACTABLE");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(value)));
    await transaction(STORE, "readwrite", store => store.put({ id: "primary", iv, ciphertext: new Uint8Array(ciphertext) }));
    current = { displayName: name, avatarDataUrl: avatar };
    render();
    return { displayName: current.displayName, hasAvatar: Boolean(current.avatarDataUrl) };
  }
  async function compressImage(file) {
    if (!(file instanceof Blob) || !/^image\/(?:jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
      throw new Error("PROFILE_IMAGE_FILE_INVALID");
    }
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("PROFILE_IMAGE_CANVAS_UNAVAILABLE");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let quality = 0.82, data = canvas.toDataURL("image/jpeg", quality);
      while (data.length > MAX_IMAGE_BYTES * 1.38 && quality > 0.4) {
        quality -= 0.1;
        data = canvas.toDataURL("image/jpeg", quality);
      }
      if (data.length > MAX_IMAGE_BYTES * 1.38) throw new Error("PROFILE_IMAGE_TOO_LARGE");
      return data;
    } finally { bitmap.close?.(); }
  }
  function render() {
    const face = $("profileInitial");
    const title = $("welcomeTitle");
    if (title) title.textContent = current.displayName || "السلام علیکم 👋";
    if (face) {
      face.replaceChildren();
      if (current.avatarDataUrl) {
        const img = document.createElement("img");
        img.src = current.avatarDataUrl;
        img.alt = "Profile photo";
        img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%";
        face.append(img);
      } else {
        face.textContent = (current.displayName || "E").trim().charAt(0).toLocaleUpperCase();
      }
    }
    const nameInput = $("myProfileName");
    if (nameInput && document.activeElement !== nameInput) nameInput.value = current.displayName;
    const preview = $("myProfilePreview");
    if (preview) {
      preview.replaceChildren();
      if (!removeAvatar && (current.avatarDataUrl || pendingAvatar)) {
        const img = document.createElement("img");
        img.src = pendingAvatar || current.avatarDataUrl;
        img.alt = "Profile preview";
        img.style.cssText = "width:54px;height:54px;object-fit:cover;border-radius:50%";
        preview.append(img);
      } else preview.textContent = (current.displayName || "E").charAt(0).toUpperCase();
    }
  }
  function status(message, error = false) {
    const node = $("myProfileStatus");
    if (node) { node.textContent = message; node.dataset.kind = error ? "error" : "ok"; }
  }
  function init() {
    const editor = $("myProfileEditor");
    $("editMyProfile")?.addEventListener("click", () => { editor.hidden = !editor.hidden; render(); });
    $("myProfilePhoto")?.addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try { pendingAvatar = await compressImage(file); removeAvatar = false; render(); status("تصویر تیار ہے؛ محفوظ کرنے کے لیے دبائیں۔"); }
      catch (error) { pendingAvatar = ""; status(error.message === "PROFILE_IMAGE_TOO_LARGE" ? "تصویر کا حجم کم نہیں ہو سکا۔ دوسری تصویر منتخب کریں۔" : "یہ تصویر استعمال نہیں ہو سکی۔", true); }
    });
    $("removeMyProfilePhoto")?.addEventListener("click", () => { pendingAvatar = ""; removeAvatar = true; render(); status("تصویر ہٹا دی گئی؛ تبدیلی محفوظ کریں۔"); });
    $("saveMyProfile")?.addEventListener("click", async () => {
      try {
        await save($("myProfileName")?.value, removeAvatar ? "" : (pendingAvatar || current.avatarDataUrl));
        pendingAvatar = ""; removeAvatar = false; editor.hidden = true;
        status("آپ کی پروفائل اسی فون میں محفوظ ہو گئی۔");
      } catch (error) {
        status(error.message === "PROFILE_NAME_INVALID" ? "نام 1 سے 48 حروف کا ہونا چاہیے۔" : "پروفائل محفوظ نہیں ہو سکی؛ مقامی محفوظ اسٹوریج چیک کریں۔", true);
      }
    });
    $("cancelMyProfile")?.addEventListener("click", () => { pendingAvatar = ""; removeAvatar = false; editor.hidden = true; render(); });
    load().then(value => {
      if (!value.displayName) {
        const node = $("myProfileName");
        if (node && !node.value) node.value = "";
      }
    }).catch(() => status("محفوظ پروفائل اسٹوریج دستیاب نہیں؛ کوئی غیر محفوظ متبادل استعمال نہیں ہوگا۔", true));
  }
  globalThis.EZERO_CONNECT_LOCAL_PROFILE = Object.freeze({ load, save, compressImage });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();