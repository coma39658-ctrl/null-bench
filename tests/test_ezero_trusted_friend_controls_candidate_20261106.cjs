/* E-ZERO trusted-friend controls static+interactive mock gate.
 * No browser permissions, public deployment or network calls.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("js/ezero_trusted_friends_controls_candidate_v0_1.js","utf8");
new vm.Script(source);
assert.doesNotMatch(source,/getUserMedia\s*\(|MediaRecorder\s*\(|new\s+WebSocket\s*\(/);
const friendFp="a".repeat(64),original="https://coma39658-ctrl.github.io/null-bench/ezero_trusted_friends_staging_20261106.html?mode=audio#room="+
  "A".repeat(32)+"."+"B".repeat(43);
const elements=new Map(),listeners=new Map(),apiListeners=new Map();
let openCount=0,trustCount=0,callCount=0,featureClicks=0,navigations=0,visibleReceipts=[];
function emit(map,type,payload){
  for(const cb of map.get(type)||[])cb(payload);
}
class Element{
  constructor(tag){this.tag=tag;this.children=[];this.events=new Map();
    this.hidden=false;this._id="";this.textContent="";this.dataset={};}
  set id(name){this._id=name;elements.set(name,this);}
  get id(){return this._id;}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  setAttribute(k,value){this[k]=value;}
  addEventListener(k,cb){
    if(!this.events.has(k))this.events.set(k,[]);
    this.events.get(k).push(cb);
  }
  click(){for(const cb of this.events.get("click")||[])cb();}
}
const root=new Element("section");root.id="ezeroTrustedFriendsLab";
const audio={click(){featureClicks++;}},video={click(){featureClicks++;}};
const document={
  documentElement:{lang:"ur"},
  getElementById:id=>elements.get(id)||null,
  createElement:tag=>new Element(tag),
  querySelector:query=>query==='[data-modern-select="audio"]'?audio:
    query==='[data-modern-select="video"]'?video:null,
  addEventListener(k,cb){
    if(!listeners.has(k))listeners.set(k,[]);
    listeners.get(k).push(cb);
  }
};
const lab={
  enabled:()=>true,
  openOwnerInbox:async()=>{openCount++;return true;},
  setFriendTrust:async(fp,allowed)=>{
    assert.equal(fp,friendFp);assert.equal(allowed,true);trustCount++;
  },
  callSavedFriend:async(fp,mode,link)=>{
    assert.equal(fp,friendFp);assert.equal(mode,"audio");
    assert.equal(link,original);callCount++;return "b".repeat(32);
  },
  safeInvite:(value,kind)=>value===original&&kind==="audio",
  confirmIncomingVisible:(fp,id)=>{
    assert.equal(fp,friendFp);assert.match(id,/^[a-f0-9]{32}$/);
    visibleReceipts.push(id);return true;
  },
  closeOwnerInbox:()=>{},
  on:(k,cb)=>{if(!apiListeners.has(k))apiListeners.set(k,[]);apiListeners.get(k).push(cb);}
};
const window={
  EZERO_TRUSTED_FRIEND_LAB:lab,
  location:{assign:()=>{navigations++;}},
  addEventListener(){}
};
const localStorage={getItem:k=>
  k==="ezero_secure_connect_local_fingerprints_v0_1"?
    JSON.stringify([{fp:friendFp,name:"Phone 2"}]):null};
vm.runInNewContext(source,{window,document,localStorage,console,setTimeout,clearTimeout});
assert.equal(root.hidden,false);
assert.equal(openCount,0);
assert.equal(callCount,0);
assert.equal(navigations,0);
assert.equal(document.getElementById("ezeroTrustedList").children.length,1);
const row=document.getElementById("ezeroTrustedList").children[0];
assert.equal(row.children[0].textContent,"Phone 2");
const byText=t=>row.children.find(x=>x.textContent===t);
assert.ok(byText("📞 کال"),"saved friend should have a real call action");
assert.ok(byText("📹 ویڈیو"));
async function test(){
  document.getElementById("ezeroTrustedEnable").click();
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(openCount,1);
  byText("✓ اجازت دیں").click();
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(trustCount,1);
  byText("📞 کال").click();
  assert.equal(featureClicks,1,
    "friend call user gesture starts existing authenticated offer creation");
  assert.equal(callCount,0,"no invitation is delivered until fresh QR is ready");
  emit(listeners,"ezero:auto-invite-ready",{detail:{link:original}});
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(callCount,1);
  assert.equal(navigations,0);
  emit(apiListeners,"incoming",{detail:{
    from:friendFp,name:"Phone 2",kind:"audio",invite:original,callId:"c".repeat(32)}});
  assert.equal(navigations,0,
    "incoming invite cannot navigate or request mic without a user click");
  assert.equal(document.getElementById("ezeroTrustedIncoming").hidden,false);
  assert.deepEqual(visibleReceipts,["c".repeat(32)],
    "Only a visible incoming call panel may authorize an app receipt");
  document.hidden=true;
  emit(apiListeners,"incoming",{detail:{
    from:friendFp,name:"Phone 2",kind:"audio",invite:original,
    callId:"d".repeat(32)}});
  document.hidden=false;
  assert.deepEqual(visibleReceipts,["c".repeat(32)],
    "Background tab must never claim incoming call was shown");
  emit(apiListeners,"incoming",{detail:{
    from:"f".repeat(64),name:"Unknown",kind:"audio",invite:original,
    callId:"e".repeat(32)}});
  assert.deepEqual(visibleReceipts,["c".repeat(32)],
    "Unknown fingerprint must not be acknowledged");
  const incoming=document.getElementById("ezeroTrustedIncoming");
  const review=incoming.children.find(x=>x.textContent.includes("دعوت کھولیں"));
  assert.ok(review);
  review.click();
  assert.equal(navigations,1,
    "only explicit user action can open accepted invitation page");
  assert.ok(source.includes("The next page still requires Accept"));
  console.log("PASS: lab cards, opted-in inbox, trust, visible-only receipt, hidden/unknown rejection, manual review, no auto navigation/media");
}
test().catch(e=>{console.error(e);process.exitCode=1;});
