import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const html = await readFile("ezero-connect-app.html", "utf8");
const js = await readFile("js/ezero_connect_app_v1.js", "utf8");
assert.match(html, /E-ZERO Connect/);
assert.match(html, /js\/ezero_connect_app_v1\.js/);
assert.doesNotMatch(html, /ezero_trusted_friends_staging|ezero_saved_friend_stage|ezero_saved_friend_stage_engine/);
assert.doesNotMatch(js, /getUserMedia|RTCPeerConnection|WebSocket|localStorage|indexedDB/);
assert.doesNotMatch(html, /احمد|سارہ|محمد|فاطمہ|sample profile/i);
assert.match(html, /id="audioCall"[^>]*disabled/);
assert.match(html, /id="videoCall"[^>]*disabled/);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:8769/ezero-connect-app.html");
  await page.waitForSelector("#emptyState");
  assert.equal(await page.locator("#audioCall").isDisabled(), true);
  assert.equal(await page.locator("#videoCall").isDisabled(), true);
  assert.match(await page.locator("#emptyTitle").innerText(), /کوئی دوست محفوظ نہیں/);

  await page.locator("#addFriend").click();
  assert.equal(await page.locator("#dialogBackdrop").evaluate(el => el.classList.contains("open")), true);
  await page.locator("#closeDialog").click();
  assert.equal(await page.locator("#dialogBackdrop").evaluate(el => el.classList.contains("open")), false);

  await page.locator("#language").click();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.match(await page.locator("#emptyTitle").innerText(), /No saved friends/);
  await page.locator("#tabChats").click();
  assert.equal(await page.locator("#tabChats").getAttribute("aria-selected"), "true");
  await page.locator("#searchFriends").fill("unknown");
  assert.match(await page.locator("#emptyTitle").innerText(), /No saved friend matches/);
  assert.deepEqual(errors, []);
  console.log("EZERO_CLEAN_BUILD_MOBILE_SHELL_TESTS_PASS");
} finally {
  await browser.close();
}
