#!/usr/bin/env python3
"""Fail closed unless the index.html changes are the exact reviewed SD=0 verdict fix.

Used by the pre-existing professional guide gate on a PR. Never writes files.
"""
from pathlib import Path
import subprocess
import sys

base = subprocess.run(
    ["git", "show", "origin/main:index.html"],
    check=True, capture_output=True, text=True
).stdout
actual = Path("index.html").read_text(encoding="utf-8")

# Permit exactly the reviewed additions-only Back/Exit navigation, without
# granting an exception to statistical algorithms, GA4 or external services.
back_anchor = '<body translate="no" class="notranslate ezero-home-modern">\n'
back_nav = '''<div id="ezeroNullBenchReturnBar" role="navigation" aria-label="E-ZERO return navigation" dir="ltr" style="position:sticky;top:0;z-index:4200;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 14px;background:#f8fbfc;border-bottom:1px solid #c7dfe8;box-shadow:0 3px 12px rgba(11,39,64,.08);">
  <a id="ezeroNullBenchBack" href="https://e-zero-dashboard.onrender.com/studio" aria-label="واپس جائیں — Back to previous E-ZERO page, or open E-ZERO Studio" style="display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:10px 16px;border-radius:10px;background:#0b4f66;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;white-space:nowrap;">← واپس / Back</a>
  <span style="font-size:12px;font-weight:750;color:#536b74;text-align:right;">E-ZERO · Null Bench</span>
</div>
<script>
(function(){
  "use strict";
  const back=document.getElementById("ezeroNullBenchBack");
  if(!back) return;
  back.addEventListener("click",function(event){
    // Only visit a genuinely preceding same-origin page; never jump to an untrusted referrer.
    // The normal href provides a functional E-ZERO Studio fallback with JavaScript off.
    if(window.history.length<2 || !document.referrer) return;
    try{
      const previous=new URL(document.referrer);
      if(previous.origin!==window.location.origin ||
         previous.pathname===window.location.pathname) return;
    }catch(_error){return;}
    event.preventDefault();
    window.history.back();
  });
})();
</script>

'''
if base.count(back_anchor) != 1:
    sys.exit("FAIL_CLOSED_BACK_ANCHOR_NOT_UNIQUE")
if actual == base.replace(back_anchor, back_anchor + back_nav, 1):
    print("EXACT_EZERO_BACK_NAV_ONLY_INDEX_CHANGE: PASS")
    sys.exit(0)

old_verdict = ''' if(outside){

  verdict.className="verdict positive";

  verdict.innerHTML=
   "<b>Outside the 95% null interval</b>"+'''
new_verdict = ''' if(sd===0){

  verdict.className="verdict";

  verdict.innerHTML=
   "<b>Degenerate null distribution (SD = 0)</b>"+
   "All sampled null values are identical, so the "+
   "z-score is undefined. This run does not support "+
   "a reliable inference about structural separation. "+
   "Review the null model and independently validate "+
   "any consequential interpretation.";

 }else if(outside){

  verdict.className="verdict positive";

  verdict.innerHTML=
   "<b>Outside the 95% null interval</b>"+'''

old_telemetry = '''   ...(z===null?{}:{z_score:Number(z.toFixed(4))}),
   outside_95_percent_interval:outside'''
new_telemetry = '''   ...(z===null?{}:{z_score:Number(z.toFixed(4))}),
   ...(sd>0?{outside_95_percent_interval:outside}:{})'''

# Permit a no-op index for guide-only PRs without loosening diff checking.
if actual == base:
    print("UNCHANGED_INDEX: PASS")
    sys.exit(0)

# Historical exact SD=0 verdict change, retained for older release branches.
if base.count(old_verdict) == 1 and base.count(old_telemetry) == 1:
    expected = base.replace(old_verdict, new_verdict, 1).replace(old_telemetry, new_telemetry, 1)
    if actual == expected:
        print("EXACT_SD_ZERO_VERDICT_ONLY_INDEX_CHANGE: PASS")
        sys.exit(0)

# After the SD=0 verdict release, permit ONLY the small floating-point
# normalization: identical raw samples must have SD=0 exactly.
old_sd = " const sd=Math.sqrt(variance);"
new_sd = """ const sd=
  nullVals.every(value=>value===nullVals[0])
   ?0
   :Math.sqrt(variance);"""
if base.count(old_sd) != 1:
    sys.exit("FAIL_CLOSED_SD_BASE_ANCHOR_NOT_UNIQUE")
expected = base.replace(old_sd, new_sd, 1)
if actual != expected:
    sys.exit("FAIL_CLOSED_UNREVIEWED_INDEX_DIFF")
print("EXACT_IDENTICAL_SAMPLES_SD_NORMALIZATION: PASS")
