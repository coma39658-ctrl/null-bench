const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("js/ezero_language_preference_staging_20261118.js","utf8");
function boot(store,search="",initial="ur"){
  const listeners={};
  const select={value:initial,addEventListener(type,fn){(listeners[type]??=[]).push(fn);},
    dispatchEvent(event){for(const fn of listeners[event.type]||[])fn(event);}};
  const html={lang:"ur",dir:"rtl"};
  const document={documentElement:html,getElementById(id){return id==="language"?select:null;}};
  const localStorage={getItem(key){return store[key]??null;},setItem(key,value){store[key]=value;}};
  class TestEvent{constructor(type,options){this.type=type;this.bubbles=!!options?.bubbles;}}
  vm.runInNewContext(source,{document,localStorage,location:{search},URLSearchParams,Event:TestEvent});
  return {select,html,store,listeners};
}
const saved={ezero_secure_connect_language_v1:"ar"};
let app=boot(saved);
assert.equal(app.select.value,"ar","Restore saved Arabic preference");
assert.equal(app.html.lang,"ar");
assert.equal(app.html.dir,"rtl");
app.select.value="en";
app.select.dispatchEvent({type:"change"});
assert.equal(app.store.ezero_secure_connect_language_v1,"en","Persist a user language change");
assert.equal(app.html.lang,"en");
assert.equal(app.html.dir,"ltr");
app=boot(saved);
assert.equal(app.select.value,"en","Preference survives a fresh page load");
app=boot({ezero_secure_connect_language_v1:"invalid"});
assert.equal(app.select.value,"ur","Reject unsupported stored language");
app=boot({ezero_secure_connect_language_v1:"ar"},"?lang=en");
assert.equal(app.select.value,"en","Explicit shared-link language overrides local preference");
assert.equal(app.html.dir,"ltr");
console.log("EZERO_LANGUAGE_PREFERENCE_RESTORE_PERSIST_DIRECTION_AND_OVERRIDE: PASS");
