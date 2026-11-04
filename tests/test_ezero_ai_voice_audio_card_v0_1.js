"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const original=fs.readFileSync("js/ezero_ai_conversation_share_v0_1.js","utf8");
const marker="  function audioShareTools(tools,text){";
assert.ok(original.includes(marker),"Audio-card helper must remain in scope");
const instrumented=original.replace(marker,"  window.__ezeroTestCreateAudioCard=makePrivateAudioCard;\n"+marker);

class LocalTestFile{
  constructor(parts,name,options={}){
    this.parts=parts;
    this.name=name;
    this.type=options.type||"";
    this.bytes=Buffer.concat(parts.map(part=>Buffer.isBuffer(part)?part:Buffer.from(String(part))));
    this.size=this.bytes.length;
  }
  async text(){return this.bytes.toString("utf8");}
}
class LocalTestFileReader{
  readAsDataURL(file){
    this.result="data:"+file.type+";base64,"+file.bytes.toString("base64");
    this.onload?.();
  }
}
const windowStub={addEventListener(){}};
const documentStub={readyState:"loading",addEventListener(){}};
vm.runInNewContext(instrumented,{
  window:windowStub,document:documentStub,
  File:LocalTestFile,FileReader:LocalTestFileReader,
  console
},{filename:"ezero_ai_conversation_share_v0_1.js"});

async function run(){
  assert.equal(typeof windowStub.__ezeroTestCreateAudioCard,"function");
  const wav=Buffer.from([0x52,0x49,0x46,0x46,0x00,0x00]);
  const input=new LocalTestFile([wav],"voice.wav",{type:"audio/wav"});
  const response='ایک نجی جواب <script>alert("x")</script> & محفوظ';
  const card=await windowStub.__ezeroTestCreateAudioCard(input,response);
  assert.equal(card.name,"E-ZERO-AI-Voice-Listen.html");
  assert.equal(card.type,"text/html");
  const html=await card.text();
  assert.match(html,/<audio controls preload="metadata"/);
  assert.match(html,/data:audio\/wav;base64,/);
  assert.match(html,new RegExp(wav.toString("base64")));
  assert.match(html,/ایک نجی جواب &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; محفوظ/);
  assert.doesNotMatch(html,/<script>alert\("x"\)<\/script>/);
  assert.match(html,/https:\/\/coma39658-ctrl\.github\.io\/null-bench\/ai\.html/);
  assert.match(html,/میری رضامندی سے E-ZERO AI کھولیں/);
  assert.match(html,/یہ صرف بھیجنے والے کا منتخب کردہ AI جواب/);
  assert.doesNotMatch(html,/<audio[^>]*\sautoplay\b/);
  assert.doesNotMatch(html,/<script\b/);
  await assert.rejects(
    windowStub.__ezeroTestCreateAudioCard({size:8*1024*1024+1},"oversize"),
    /AUDIO_TOO_LARGE_FOR_CARD/
  );
  console.log("PORTABLE_AUDIO_FILE_PLAYBACK_AND_TEXT_ESCAPE: PASS");
  console.log("CONSENT_FIRST_VISIBLE_LINK: PASS");
  console.log("NO_AUTOPLAY_OR_ACTIVE_SCRIPT: PASS");
  console.log("LOCAL_CARD_SIZE_BOUND: PASS");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
