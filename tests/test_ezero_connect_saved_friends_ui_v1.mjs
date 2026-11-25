import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true });
try {
  const page = await context.newPage();
  const fp = "AB:".repeat(31) + "AB";
  const contacts = [{ relationshipId: "rel-1", remoteFingerprint: fp, displayName: "Friend One", status: "TRUSTED" }];
  await page.addInitScript(rows => {
    window.__testContacts = rows;
    window.__avatarEnabled = true;
    Object.defineProperty(window, "EZERO_CONNECT_TRUST", {
      configurable: true,
      get() { return this.__testTrust; },
      set(value) { this.__testTrust = Object.assign({}, value, {
        listTrustedContacts: async () => this.__testContacts,
        getTrustedFriendProfile: async relationshipId => window.__avatarEnabled && relationshipId === "rel-1"
          ? { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) }
          : { bytes: null }
      }); }
    });
  }, contacts);
  await page.goto("http://127.0.0.1:8769/ezero-connect-app.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.EZERO_CONNECT_CONTACTS_UI));
  await page.evaluate(() => window.EZERO_CONNECT_CONTACTS_UI.refresh());
  assert.equal(await page.locator(".ezero-saved-friend").count(), 1);
  assert.equal(await page.locator(".ezero-saved-friend strong").textContent(), "Friend One");
  await page.waitForSelector(".ezero-saved-friend img[alt=\"Verified friend's saved profile photo\"]");
  assert.match(await page.locator(".ezero-saved-friend img").getAttribute("src"), /^blob:/,
    "verified friend's encrypted saved DP must render in the saved-friends list");
  await page.evaluate(() => {
    window.__avatarEnabled = false;
    document.dispatchEvent(new CustomEvent("ezero:friend-profile-updated", {
      detail: { relationshipId: "rel-1", fingerprint: window.__testContacts[0].remoteFingerprint }
    }));
  });
  await page.waitForFunction(() => !document.querySelector(".ezero-saved-friend img"));
  await page.evaluate(() => {
    window.__avatarEnabled = true;
    document.dispatchEvent(new CustomEvent("ezero:friend-profile-updated", {
      detail: { relationshipId: "rel-1", fingerprint: window.__testContacts[0].remoteFingerprint }
    }));
  });
  await page.waitForSelector(".ezero-saved-friend img");
  await page.locator(".ezero-saved-friend").click();
  assert.equal(await page.evaluate(() => window.EZERO_CONNECT_CONTACTS_UI.getSelected()), fp);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("ezero_connect_selected_friend_tab_v1")), fp);
  assert.equal(await page.locator("#audioCall").isDisabled(), true);
  assert.equal(await page.locator("#videoCall").isDisabled(), true);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.EZERO_CONNECT_CONTACTS_UI));
  await page.evaluate(() => window.EZERO_CONNECT_CONTACTS_UI.refresh());
  assert.equal(await page.evaluate(() => window.EZERO_CONNECT_CONTACTS_UI.getSelected()), fp,
    "selected verified friend must survive same-tab page navigation");
  assert.equal(await page.locator(".ezero-saved-friend").getAttribute("aria-pressed"), "true");

  await page.evaluate(async () => {
    window.__testContacts = [];
    await window.EZERO_CONNECT_CONTACTS_UI.refresh();
  });
  assert.equal(await page.evaluate(() => window.EZERO_CONNECT_CONTACTS_UI.getSelected()), null,
    "removed or revoked contact must not remain selected");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("ezero_connect_selected_friend_tab_v1")), null);

  // Large synthetic contact set: all records remain available while the DOM
  // renders only one bounded page at a time.
  await page.evaluate(async () => {
    const fp = n => Array.from({ length: 32 }, (_, i) => ((n * 37 + i * 13) % 256).toString(16).padStart(2, "0").toUpperCase()).join(":");
    window.__testContacts = Array.from({ length: 525 }, (_, i) => ({
      relationshipId: "rel-large-" + i,
      remoteFingerprint: fp(i + 1),
      displayName: "Synthetic Friend " + String(i + 1).padStart(3, "0"),
      status: "TRUSTED"
    }));
    await window.EZERO_CONNECT_CONTACTS_UI.refresh();
  });
  assert.equal(await page.locator(".ezero-saved-friend").count(), 40,
    "initial render must be bounded to 40 friend rows");
  assert.match(await page.locator("#savedFriendsList").innerText(), /40/);
  assert.match(await page.locator("#savedFriendsList").innerText(), /525/);
  await page.locator("#loadMoreFriends").click();
  assert.equal(await page.locator(".ezero-saved-friend").count(), 80,
    "load more must add one bounded page");
  await page.locator("#searchFriends").fill("Synthetic Friend 525");
  assert.equal(await page.locator(".ezero-saved-friend").count(), 1,
    "search must find a contact beyond the first page");
  assert.match(await page.locator(".ezero-saved-friend strong").textContent(), /Synthetic Friend 525/);
  assert.equal(await page.evaluate(() => window.__testContacts.length), 525,
    "pagination must not truncate or delete stored contacts");
  console.log("EZERO_CLEAN_UI_SAVED_FRIEND_NAME_RETENTION_SELECTION_AND_PAGINATION_PASS");
} finally {
  await context.close();
  await browser.close();
}