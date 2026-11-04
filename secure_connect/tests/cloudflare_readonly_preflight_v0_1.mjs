/*
 * E-ZERO Cloudflare account permissions preflight.
 * Absolutely READ ONLY: GET /user/tokens/verify, GET Worker scripts,
 * GET Durable Objects namespaces. No authenticated writes or deployments.
 * Never print credentials, account ID, response bodies or private names.
 * This is not proof of paid/free plan, ability to write, or available quota.
 */
"use strict";
const token=(process.env.CLOUDFLARE_API_TOKEN||"").trim();
const account=(process.env.CLOUDFLARE_ACCOUNT_ID||"").trim();
const report=(key,value)=>process.stdout.write("E-ZERO CF READONLY "+key+": "+value+"\n");
if(!token || !account){
  report("CREDENTIALS","NOT_CONFIGURED_IN_THIS_REPO");
  report("SCRIPTS","UNKNOWN");
  report("DURABLE_OBJECTS","UNKNOWN");
  report("BILLING","UNKNOWN_NO_ACCOUNT_ACCESS");
  process.exit(0);
}
if(!/^[a-f0-9]{32}$/i.test(account) || !/^[A-Za-z0-9_-]{20,200}$/.test(token)){
  report("CREDENTIALS","INVALID_FORMAT");
  process.exit(0);
}
const url="https://api.cloudflare.com/client/v4";
async function get(path){
  try{
    const res=await fetch(url+path,{method:"GET",headers:{
      Authorization:"Bearer "+token,
      Accept:"application/json"
    },redirect:"error",signal:AbortSignal.timeout(9000)});
    if(!res.ok)return "HTTP_"+res.status;
    const result=await res.json();
    return result?.success===true?"READ_OK":"API_REJECTED";
  }catch(_){return "UNAVAILABLE";}
}
report("TOKEN",await get("/user/tokens/verify"));
report("WORKERS_SCRIPTS",await get("/accounts/"+account+"/workers/scripts"));
report("SQLITE_DURABLE_OBJECTS",await get("/accounts/"+account+"/workers/durable_objects/namespaces?per_page=1"));
report("WRITE_DEPLOY_PERMISSION","NOT_TESTED");
report("PLAN_AND_BILLING","UNKNOWN");
report("DEPLOYMENT","NONE_READONLY");
