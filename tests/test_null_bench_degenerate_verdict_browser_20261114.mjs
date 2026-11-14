import assert from "node:assert/strict";
import {chromium} from "playwright";

/* Browser-only QA of the existing #try UI, served on 127.0.0.1.
 * All external requests are blocked and all tests run without production deployment.
 * Retain 4 submitted lines because UI requires at least 4 input rows.
 */
const browser=await chromium.launch({headless:true});
try {
  for (const width of [360,800]) {
    const context=await browser.newContext({
      viewport:{width,height:900},
      reducedMotion:"reduce",
      serviceWorkers:"block"
    });
    const page=await context.newPage();
    await page.route("**/*",route=>{
      const url=new URL(route.request().url());
      return url.hostname==="127.0.0.1"?route.continue():route.abort();
    });
    const response=await page.goto("http://127.0.0.1:8768/index.html#try",{
      waitUntil:"domcontentloaded"
    });
    assert.equal(response.status(),200);
    for (const [scenario,edges,expectedNodesEdges] of [
      ["CHAIN_DUPLICATE_SELF_LOOP","a,b\nb,a\na,a\nb,c","3 / 2"],
      ["TRIANGLE_DUPLICATE","a,b\nb,c\nc,a\na,b","3 / 3"]
    ]) {
      await page.locator("#demoSelect").selectOption("custom");
      await page.locator("#edgeInput").fill(edges);
      await page.locator("#nullSamples").fill("20");
      await page.locator("#swapAttempts").fill("30");
      await page.locator("#runBtn").click();
      await page.waitForFunction(()=>document.getElementById("status").textContent.includes("Done —"),
        null,{timeout:12000});
      const nodesEdges=await page.locator("#statNE").textContent();
      const z=await page.locator("#statZ").textContent();
      const nul=await page.locator("#statNull").textContent();
      const verdict=await page.locator("#verdict").innerText();
      assert.equal(nodesEdges.trim(),expectedNodesEdges,
        "distinct edges must be counted from graph adjacency, not input rows");
      assert.equal(z.trim(),"N/A","zero sample SD has undefined z-score");
      assert.match(nul,/± 0\.0000/);
      assert.match(verdict,/Degenerate null distribution \(SD = 0\)/);
      assert.match(verdict,/undefined/);
      assert.doesNotMatch(verdict,/No structural separation was detected|Within the 95% null interval|Outside the 95% null interval/);
      console.log("REAL_BROWSER_DEGENERATE_VERDICT_PASS",JSON.stringify({width,scenario,nodesEdges,z}));
    }
    await context.close();
  }
} finally {
  await browser.close();
}
