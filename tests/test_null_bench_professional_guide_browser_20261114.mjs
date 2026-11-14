import assert from "node:assert/strict";
import {chromium} from "playwright";
const browser=await chromium.launch({headless:true});
const root="http://127.0.0.1:8767/";
try{
  for(const width of [360,800,1280]){
    const context=await browser.newContext({
      viewport:{width,height:820},
      reducedMotion:"reduce",
      serviceWorkers:"block"
    });
    const page=await context.newPage();
    await page.route("**/*",route=>{
      const url=new URL(route.request().url());
      if(url.hostname==="127.0.0.1")return route.continue();
      return route.abort();
    });
    const r=await page.goto(root+"index.html",{waitUntil:"domcontentloaded"});
    assert.equal(r.status(),200);
    const entry=page.locator("#null-bench-professional-entry");
    await entry.waitFor({state:"visible"});
    assert.match(await entry.innerText(),/خاص سائنسی/);
    assert.match(await entry.innerText(),/Professional research audience/);
    assert.match(await entry.innerText(),/JavaScript/);
    await entry.locator("a[href='./null_bench_professional_guide.html']").click();
    await page.waitForURL("**/null_bench_professional_guide.html",{timeout:10000});
    assert.equal(await page.locator("h1").innerText(),
      "Null Bench — Professional Research & Testing Guide");
    assert.equal(await page.locator("#urdu").getAttribute("dir"),"rtl");
    assert.equal(await page.locator("#english").getAttribute("lang"),"en");
    assert.equal(await page.locator("#arabic").getAttribute("dir"),"rtl");
    assert.match(await page.locator("#urdu").innerText(),/Python/);
    assert.match(await page.locator("#english").innerText(),/double-edge|JavaScript|Python/i);
    assert.match(await page.locator("#arabic").innerText(),/JavaScript/);
    const dims=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,
      scroll:document.documentElement.scrollWidth}));
    assert.ok(dims.scroll<=dims.viewport+5,
      "PROFESSIONAL_GUIDE_HORIZONTAL_OVERFLOW_"+width+"_"+JSON.stringify(dims));
    const backButton=page.locator("#ezeroGuideBack");
    assert.equal(await backButton.isVisible(),true,
      "PROFESSIONAL_GUIDE_BACK_BUTTON_VISIBLE_"+width);
    assert.match(await backButton.innerText(),/واپس.*Back/);
    assert.equal(await backButton.getAttribute("href"),
      "./index.html#null-bench-professional-entry");
    const tapTarget=await backButton.boundingBox();
    assert.ok(tapTarget && tapTarget.height>=44,
      "PROFESSIONAL_GUIDE_BACK_TOUCH_TARGET_"+width);
    await backButton.click();
    await page.waitForURL("**/index.html#null-bench-professional-entry",{timeout:10000});
    assert.equal(await page.locator("#null-bench-professional-entry").count(),1);
    assert.equal(await page.locator("#try #runBtn").count(),1);
    console.log("PROFESSIONAL_GUIDE_BACK_"+width+"_PASS");
    if(width===360){
      await page.locator("#edgeInput").fill("a,b\na,c\nb,c\nc,d\nd,e\ne,f\nf,d\nb,e");
      await page.locator("#nullSamples").fill("20");
      await page.locator("#swapAttempts").fill("30");
      await page.locator("#runBtn").click();
      await page.waitForFunction(()=>document.getElementById("statNE").textContent.trim()!=="—",
        null,{timeout:15000});
      assert.match(await page.locator("#statNE").innerText(),/6\s*\/\s*8/);
      assert.notEqual((await page.locator("#statNull").innerText()).trim(),"—");
      assert.match(await page.locator("#status").innerText(),/Done/);
      console.log("EXISTING_BROWSER_GRAPH_TEST_RUN_FROM_GUIDED_PAGE_PASS");
    }
    await context.close();
    console.log("PROFESSIONAL_GUIDE_BROWSER_"+width+"_PASS");
  }
}catch(e){
  console.error("PROFESSIONAL_GUIDE_BROWSER_QA_FAIL",e.stack||String(e));
  process.exitCode=1;
}finally{
  await browser.close();
}
