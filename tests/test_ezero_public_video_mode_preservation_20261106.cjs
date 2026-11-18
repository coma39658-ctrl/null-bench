/* E-ZERO production hotfix: run the actual UI mode-selection function,
 * not a copied implementation. No permissions, network or real capture. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const script=fs.readFileSync("js/ezero_secure_connect_modern_evidence_stage_v0_1.js","utf8");
const first=script.indexOf("function select(type){");
const after=script.indexOf("\nfor(const b of document.querySelectorAll",first);
assert.ok(first>=0&&after>first,"Production select() implementation must be present");
const source=script.slice(first,after);
const panels=Object.fromEntries(["modernCallPanel","modernVoicePanel","modernChatPanel","modernFeatureHelp"]
  .map(id=>[id,{hidden:false}]));
const buttons=["audio","video","voice","chat"].map(type=>({
  dataset:{modernSelect:type},pressed:"",
  setAttribute(name,value){if(name==="aria-pressed")this.pressed=value;}
}));
const radios={audio:{value:"audio",_checked:true},video:{value:"video",_checked:false}};
for(const mode of ["audio","video"]){
  Object.defineProperty(radios[mode],"checked",{
    get(){return this._checked;},
    set(value){this._checked=Boolean(value);
      if(value)radios[mode==="audio"?"video":"audio"]._checked=false;}
  });
}
const document={querySelectorAll:selector=>{
  assert.equal(selector,"[data-modern-select]");return buttons;}};
const lookup=id=>panels[id];
const pick=selector=>{
  const match=/value="(audio|video)"/.exec(selector);
  return match?radios[match[1]]:null;
};
const window={};
const t=()=> "Audio/video mode is locked during a call.";
const app=new Function("document","$","pick","explain","window","t",`let current="audio";
${source}
return {select,getCurrent:()=>current};`)(document,lookup,pick,()=>{},window,t);
app.select("video");
assert.equal(radios.video.checked,true,"Video click must select video media");
assert.equal(window.EZERO_SELECTED_CALL_MODE,"video","Video choice must be stored as the selected call mode");
assert.equal(panels.modernCallPanel.hidden,false);
app.select("voice");
assert.equal(radios.video.checked,true,"Voice-note UI must not downgrade video to audio");
assert.equal(panels.modernVoicePanel.hidden,false);
app.select("chat");
assert.equal(radios.video.checked,true,"Chat UI must not downgrade video to audio");
assert.equal(panels.modernChatPanel.hidden,false);
app.select("audio");
assert.equal(radios.audio.checked,true,"Audio click must explicitly select audio media");
app.select("chat");
assert.equal(radios.audio.checked,true,"Chat must preserve an audio selection as well");
assert.equal(buttons.find(b=>b.dataset.modernSelect==="chat").pressed,"true");
window.EZERO_ACTIVE_CALL_MODE="video";
app.select("video");
app.select("audio");
assert.equal(radios.video.checked,true,"An active video call cannot be changed to audio");
assert.equal(window.EZERO_SELECTED_CALL_MODE,"video","The active mode remains locked");
window.EZERO_ACTIVE_CALL_MODE=null;
app.select("audio");
assert.equal(radios.audio.checked,true,"A new audio call can be explicitly selected after hangup");
console.log("PUBLIC_VIDEO_VOICE_CHAT_MODE_PRESERVATION_AND_LOCK: PASS");
