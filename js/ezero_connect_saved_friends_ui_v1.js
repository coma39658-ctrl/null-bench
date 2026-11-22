(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "ezero_connect_selected_friend_tab_v1";
  const PAGE_SIZE = 40;
  const copy = {
    ur: { selected:"منتخب دوست", empty:"ابھی کوئی محفوظ دوست نہیں۔ پہلے باہمی منظوری مکمل کریں۔", unavailable:"محفوظ دوستوں کی فہرست ابھی دستیاب نہیں۔", saved:"محفوظ دوست", callPending:"دوست منتخب ہے؛ کال سروس ابھی منسلک نہیں۔", more:"مزید دوست دکھائیں", shown:"دکھائے گئے", of:"از", searchEmpty:"اس تلاش میں کوئی دوست نہیں ملا۔" },
    en: { selected:"Selected friend", empty:"No saved friends yet. Complete mutual approval first.", unavailable:"Saved friends are temporarily unavailable.", saved:"Saved friend", callPending:"Friend selected; calling service is not connected yet.", more:"Show more friends", shown:"Shown", of:"of", searchEmpty:"No friends match this search." },
    ar: { selected:"الصديق المحدد", empty:"لا يوجد أصدقاء محفوظون بعد. أكمل الموافقة المتبادلة أولاً.", unavailable:"قائمة الأصدقاء المحفوظين غير متاحة مؤقتاً.", saved:"صديق محفوظ", callPending:"تم اختيار الصديق؛ خدمة الاتصال غير متصلة بعد.", more:"عرض المزيد من الأصدقاء", shown:"المعروض", of:"من", searchEmpty:"لا يوجد أصدقاء يطابقون البحث." }
  };
  let contacts = [];
  let selected = null;
  let language = "ur";
  let pageCount = 1;
  let renderGeneration = 0;
  const avatarUrls = new Set();

  function clearAvatarUrls() {
    for (const url of avatarUrls) URL.revokeObjectURL(url);
    avatarUrls.clear();
  }

  async function hydrateFriendAvatar(contact, face, button, generation) {
    const api = window.EZERO_CONNECT_TRUST;
    if (!api || typeof api.getTrustedFriendProfile !== "function" ||
        typeof contact.relationshipId !== "string" || !contact.relationshipId) return;
    try {
      const profile = await api.getTrustedFriendProfile(contact.relationshipId, contact.remoteFingerprint);
      if (generation !== renderGeneration || !button.isConnected ||
          !contacts.some(item => item.relationshipId === contact.relationshipId &&
            item.remoteFingerprint === contact.remoteFingerprint && item.status === "TRUSTED")) return;
      const bytes = profile?.bytes;
      if (!(bytes instanceof Uint8Array) || bytes.length < 4 || bytes.length > 140 * 1024 ||
          bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return;
      const url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
      avatarUrls.add(url);
      const image = document.createElement("img");
      image.alt = "Verified friend's saved profile photo";
      image.width = 38;
      image.height = 38;
      image.style.cssText = "width:38px;height:38px;object-fit:cover;border-radius:50%";
      image.src = url;
      face.replaceChildren(image);
    } catch (_) {
      // A missing or unreadable avatar must not hide the trusted contact or its initials.
    }
  }

  function validFingerprint(value) {
    return typeof value === "string" && /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value);
  }
  function readSelection() {
    try {
      const value = sessionStorage.getItem(KEY);
      return validFingerprint(value) ? value : null;
    } catch (_) { return null; }
  }
  function writeSelection(value) {
    try {
      if (value) sessionStorage.setItem(KEY, value);
      else sessionStorage.removeItem(KEY);
    } catch (_) {}
  }
  function render() {
    const root = $("savedFriendsList");
    if (!root) return;
    const t = copy[language] || copy.ur;
    const generation = ++renderGeneration;
    clearAvatarUrls();
    root.replaceChildren();
    const trusted = contacts.filter(c => c && c.status === "TRUSTED" && validFingerprint(c.remoteFingerprint));
    if (selected && !trusted.some(c => c.remoteFingerprint === selected)) {
      selected = null;
      writeSelection(null);
    }
    const query = ($("searchFriends")?.value || "").trim().toLocaleLowerCase();
    const visible = trusted.filter(c => {
      const name = String(c.displayName || "").trim();
      return !query || name.toLocaleLowerCase().includes(query) || c.remoteFingerprint.toLocaleLowerCase().includes(query);
    });
    const maxRows = Math.max(PAGE_SIZE, pageCount * PAGE_SIZE);
    const page = visible.slice(0, maxRows);
    root.hidden = false;
    if (!visible.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = trusted.length ? t.searchEmpty : t.empty;
      root.append(p);
    } else {
      const fragment = document.createDocumentFragment();
      for (const contact of page) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ezero-saved-friend" + (contact.remoteFingerprint === selected ? " is-selected" : "");
        button.setAttribute("aria-pressed", String(contact.remoteFingerprint === selected));
        button.style.cssText = "width:100%;display:flex;align-items:center;gap:12px;text-align:start;border:1px solid #e2ebe5;border-radius:14px;background:#fff;padding:12px;margin:7px 0;color:#18352a";
        const face = document.createElement("span");
        face.textContent = (String(contact.displayName || "").trim()[0] || "E").toLocaleUpperCase();
        face.style.cssText = "width:38px;height:38px;flex:0 0 38px;border-radius:50%;display:grid;place-items:center;background:#eaf6ed;color:#174c39;font-weight:800";
        const info = document.createElement("span");
        info.style.cssText = "min-width:0;display:block";
        const name = document.createElement("strong");
        name.textContent = String(contact.displayName || "").trim() || "E-ZERO friend";
        name.style.cssText = "display:block;font-size:13px";
        const fp = document.createElement("small");
        fp.textContent = contact.remoteFingerprint.slice(0, 14) + "…";
        fp.style.cssText = "display:block;font-size:10px;color:#718278;direction:ltr;text-align:start";
        info.append(name, fp);
        button.append(face, info);
        button.addEventListener("click", () => {
          selected = contact.remoteFingerprint;
          writeSelection(selected);
          render();
          const status = $("callStatus");
          if (status) status.textContent = (copy[language] || copy.ur).callPending;
          document.dispatchEvent(new CustomEvent("ezero:friend-selected", { detail: { fingerprint: selected, relationshipId: contact.relationshipId || null, displayName: String(contact.displayName || "").trim() } }));
        });
        fragment.append(button);
      }
      root.append(fragment);
      const footer = document.createElement("div");
      footer.className = "muted";
      footer.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 2px";
      const count = document.createElement("span");
      count.textContent = t.shown + " " + page.length + " " + t.of + " " + visible.length;
      footer.append(count);
      if (page.length < visible.length) {
        const more = document.createElement("button");
        more.type = "button";
        more.id = "loadMoreFriends";
        more.className = "secondary";
        more.textContent = t.more;
        more.addEventListener("click", () => { pageCount += 1; render(); });
        footer.append(more);
      }
      root.append(footer);
    }
    const chosen = trusted.find(c => c.remoteFingerprint === selected);
    if (chosen && $("callStatus")) $("callStatus").textContent = t.selected + ": " + (chosen.displayName || "E-ZERO friend") + " — " + t.callPending;
  }
  async function refresh() {
    const api = window.EZERO_CONNECT_TRUST;
    if (!api || typeof api.listTrustedContacts !== "function") {
      contacts = [];
      const root = $("savedFriendsList");
      if (root) { root.hidden = false; root.textContent = (copy[language] || copy.ur).unavailable; }
      return [];
    }
    try {
      contacts = await api.listTrustedContacts();
      selected = readSelection();
      pageCount = 1;
      render();
      return contacts.slice();
    } catch (_) {
      contacts = [];
      selected = null;
      writeSelection(null);
      const root = $("savedFriendsList");
      if (root) { root.hidden = false; root.textContent = (copy[language] || copy.ur).unavailable; }
      return [];
    }
  }
  function setLanguage(value) {
    if (["ur","en","ar"].includes(value)) language = value;
    render();
  }
  document.addEventListener("ezero:friend-local-saved", refresh);
  document.addEventListener("ezero:friend-local-removed", refresh);
  document.addEventListener("ezero:friend-profile-updated", refresh);
  $("searchFriends")?.addEventListener("input", () => { pageCount = 1; render(); });
  $("language")?.addEventListener("click", () => {
    language = language === "ur" ? "en" : language === "en" ? "ar" : "ur";
    render();
  });
  window.addEventListener("pageshow", refresh);
  window.addEventListener("focus", refresh);
  window.EZERO_CONNECT_CONTACTS_UI = Object.freeze({ refresh, setLanguage, getSelected: () => selected });
  refresh();
})();