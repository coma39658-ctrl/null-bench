import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true });
try {
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8769/ezero-connect-app.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.EZERO_CONNECT_CONTACTS_UI));
  const fp = "AB:".repeat(31) + "AB";
  const contacts = [{ relationshipId: "rel-1", remoteFingerprint: fp, displayName: "Friend One", status: "TRUSTED" }];
  await page.evaluate(async rows => {
    window.EZERO_CONNECT_TRUST.listTrustedContacts = async () => rows;
    await window.EZERO_CONNECT_CONTACTS_UI.refresh();
  }, contacts);
  assert.equal(await page.locator(".ezero-saved-friend").count(), 1);
  assert.equal(await page.locator(".ezero-saved-friend strong").textContent(), "Friend One");
  await page.locator(".ezero-saved-friend").click();
  assert.equal(await page.evaluate(() => window.EZERO_CONNECT_CONTACTS_UI.getSelected()), fp);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("ezero_connect_selected_friend_tab_v1")), fp);
  assert.equal(await page.locator("#audioCall").isDisabled(), true);
  assert.equal(await page.locator("#videoCall").isDisabled(), true);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.EZERO_CONNECT_CONTACTS_UI));
  await page.evaluate(async rows => {
    window.EZERO_CONNECT_TRUST.listTrustedContacts = async () => rows;
    await window.EZERO_CONNECT_CONTACTS_UI.refresh();
  }, contacts);
  assert.equal(await page.evaluate(() => window.EZERO_CONNECT_CONTACTS_UI.getSelected()), fp,
    "selected verified friend must survive same-tab page navigation");
  assert.equal(await page.locator(".ezero-saved-friend").getAttribute("aria-pressed"), "true");

  await page.evaluate(async () => {
    window.EZERO_CONNECT_TRUST.listTrustedContacts = async () => [];
    await window.EZERO_CONNECT_CONTACTS_UI.refresh();
  });
  assert.equal(await page.evaluate(() => window.EZERO_CONNECT_CONTACTS_UI.getSelected()), null,
    "removed or revoked contact must not remain selected");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("ezero_connect_selected_friend_tab_v1")), null);
  console.log("EZERO_CLEAN_UI_SAVED_FRIEND_NAME_RETENTION_AND_SELECTION_PASS");
} finally {
  await context.close();
  await browser.close();
}