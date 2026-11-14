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
