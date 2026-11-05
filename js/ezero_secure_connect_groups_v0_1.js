/* E-ZERO Secure Connect group drafts v0.1.
 * WhatsApp-familiar navigation, NOT WhatsApp software.
 * Local-only planning: selected fingerprints are NOT joined participants.
 * No invite, group message, media or group call is sent by this module.
 * Real group transport requires authenticated consent, fanout and E2EE review.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  if (!$("ezeroGroupsHub") || !$("ezeroGroupForm")) return;
  const GROUPS_KEY="ezero_secure_connect_group_drafts_v0_1";
  const CONTACTS_KEY="ezero_secure_connect_local_fingerprints_v0_1";
  const MAX_GROUPS=20, MAX_MEMBERS=20, MAX_TEXT=60;
  const FP=/^[a-f0-9]{64}$/;
  const ID=/^[a-f0-9]{32}$/;
  const icons=["👥","💬","🛠️","🚗","👨‍👩‍👧","🌍"];
  const $lang=()=>["ur","en","ar"].includes(document.documentElement.lang)?document.documentElement.lang:"ur";
  const strings={
    ur:{shortcut:"👥 گروپس",heading:"👥 گروپس",description:"واٹس ایپ جیسے آسان مراحل میں مقامی گروپ تیار کریں۔ یہ صرف آپ کے فون کا مسودہ ہے؛ منتخب دوست ابھی شامل نہیں ہوئے۔",
      new:"＋ نیا گروپ",groups:"میرے گروپس",empty:"ابھی کوئی گروپ نہیں۔ نیا گروپ بنائیں۔",
      name:"گروپ کا نام",about:"گروپ کی تفصیل (اختیاری)",icon:"گروپ کا نشان",people:"دوست منتخب کریں (دستخط شدہ QR سے محفوظ شدہ)",
      noFriends:"پہلے QR شناخت کی تصدیق سے دوست محفوظ کریں۔",save:"✓ گروپ مسودہ محفوظ کریں",
      cancel:"واپس",edit:"گروپ کی تفصیل / ممبران بدلیں",delete:"گروپ مسودہ حذف کریں",
      draft:"صرف اس فون کا گروپ مسودہ",members:"منتخب دوست (ابھی شامل نہیں ہوئے)",
      status:"گروپ میسج، وائس نوٹ، آڈیو اور ویڈیو کال ابھی فعال نہیں۔ ہر دوست کی علیحدہ تصدیق اور رضامندی، محفوظ گروپ رابطہ اور حقیقی آزمائش کے بعد فعال ہوں گے۔",
      chat:"💬 گروپ چیٹ — ابھی بند",audio:"📞 گروپ آڈیو — ابھی بند",video:"📹 گروپ ویڈیو — ابھی بند",
      voice:"🎙️ گروپ وائس — ابھی بند",saved:"✓ مسودہ اس فون پر محفوظ ہوا؛ کسی دوست کو دعوت نہیں بھیجی گئی۔",
      updated:"✓ مقامی گروپ کی تبدیلی محفوظ ہوئی؛ دوسرے فون نہیں بدلے۔",
      deleted:"گروپ مسودہ صرف اس فون سے حذف ہوا۔",storage:"اس فون کا اسٹوریج دستیاب نہیں؛ گروپ محفوظ نہیں ہوا۔",
      invalid:"درست نام اور کم از کم ایک تصدیق شدہ دوست منتخب کریں۔",full:"گروپ/ممبر کی حد پوری ہو گئی۔",
      confirm:"کیا صرف اس فون سے گروپ مسودہ حذف کرنا ہے؟",
      unavailable:"دوستوں کی محفوظ فہرست اس فون پر دستیاب نہیں۔",
      addFriend:"+ QR سے دوست شامل کریں",back:"← گروپس کی فہرست",memberCount:"منتخب رابطے",
      groupPhoto:"گروپ کا منتخب نشان",source:"یہ مقامی فہرست ہے؛ حقیقی گروپ، کال، یا چیٹ کنکشن کا ثبوت نہیں۔",
      admin:"🛡️ Group Admin — یہ فون (صرف مقامی)",policy:"ایڈمن گروپ کی معلومات اور منتخب رابطے بدل سکتا ہے؛ دوسرے فون پر اختیار نافذ نہیں۔",
      approval:"نئے ممبرز کے لیے ایڈمن کی منظوری (آئندہ فیچر)",editOnly:"گروپ کی معلومات صرف ایڈمن بدلے (آئندہ فیچر)",promote:"🛡️ دوسرے ایڈمن کا اختیار — ابھی بند"},
    en:{shortcut:"👥 Groups",heading:"👥 Groups",description:"Create a group with familiar steps. This is a draft on your device only; selected friends have NOT joined.",
      new:"＋ New group",groups:"My groups",empty:"No groups yet. Create a group.",
      name:"Group name",about:"Description (optional)",icon:"Group icon",people:"Select friends (saved from verified signed QR)",
      noFriends:"First add friends after verifying a signed QR.",save:"✓ Save group draft",cancel:"Back",
      edit:"Edit details / proposed members",delete:"Delete group draft",draft:"Local group draft only",
      members:"Selected friends (not joined)",status:"Group chat, voice notes, audio and video calls are NOT active. Individual authentication, consent, secure group transport and real tests are required.",
      chat:"💬 Group chat — unavailable",audio:"📞 Group audio — unavailable",video:"📹 Group video — unavailable",
      voice:"🎙️ Group voice — unavailable",saved:"✓ Saved on this device; no invitation was sent.",
      updated:"✓ Local group draft updated; other devices did not change.",
      deleted:"Group draft deleted on this device only.",storage:"Browser storage unavailable; nothing saved.",
      invalid:"Choose a group name and at least one verified saved friend.",full:"Group/member limit reached.",
      confirm:"Delete this group draft from this device only?",unavailable:"Saved friends are unavailable on this device.",
      addFriend:"+ Add friend with QR",back:"← All groups",memberCount:"Selected contacts",
      groupPhoto:"Selected group icon",source:"This local list is not proof of a live group, calls or chat.",
      admin:"🛡️ Group Admin — this phone (local only)",policy:"The creator can edit group details and proposed members here; no permissions are enforced on other phones.",
      approval:"Admin approval for new members (future policy)",editOnly:"Only admin can edit group details (future policy)",promote:"🛡️ Assign co-admin — unavailable"},
    ar:{shortcut:"👥 المجموعات",heading:"👥 المجموعات",description:"أنشئ مجموعة بخطوات مألوفة. هذه مسودة محلية فقط؛ الأصدقاء المحددون لم ينضموا.",
      new:"＋ مجموعة جديدة",groups:"مجموعاتي",empty:"لا توجد مجموعات بعد. أنشئ مجموعة.",
      name:"اسم المجموعة",about:"وصف المجموعة (اختياري)",icon:"رمز المجموعة",people:"اختر أصدقاء تم حفظهم بعد QR موقّع",
      noFriends:"أضف أصدقاء بعد التحقق من QR الموقّع.",save:"✓ حفظ مسودة المجموعة",cancel:"رجوع",
      edit:"تعديل التفاصيل / الأعضاء المقترحين",delete:"حذف المسودة",draft:"مسودة محلية فقط",
      members:"الأصدقاء المحددون (لم ينضموا)",status:"الدردشة الجماعية والرسائل الصوتية والمكالمات الصوتية والمرئية غير مفعّلة. يلزم التحقق والموافقة والاتصال الآمن والاختبارات الحقيقية.",
      chat:"💬 دردشة المجموعة — غير متاحة",audio:"📞 اتصال صوتي — غير متاح",video:"📹 اتصال فيديو — غير متاح",
      voice:"🎙️ رسالة صوتية — غير متاحة",saved:"✓ حُفظت محلياً؛ لم تُرسل دعوة.",
      updated:"✓ حُدّثت المسودة محلياً؛ لم تتغير الأجهزة الأخرى.",
      deleted:"حُذفت المسودة من هذا الجهاز فقط.",storage:"التخزين المحلي غير متاح؛ لم يُحفظ شيء.",
      invalid:"اختر اسماً وصديقاً واحداً موثقاً على الأقل.",full:"تم بلوغ الحد المسموح.",
      confirm:"حذف مسودة المجموعة من هذا الجهاز فقط؟",unavailable:"قائمة الأصدقاء غير متاحة على هذا الجهاز.",
      addFriend:"+ إضافة صديق عبر QR",back:"← جميع المجموعات",memberCount:"جهات الاتصال المحددة",
      groupPhoto:"رمز المجموعة",source:"هذه قائمة محلية وليست دليلاً على اتصال مجموعة أو مكالمات أو محادثة.",
      admin:"🛡️ مشرف المجموعة — هذا الهاتف فقط",policy:"يمكن للمنشئ تعديل التفاصيل والأعضاء المقترحين محلياً. لا توجد صلاحيات فعلية على أجهزة الآخرين.",
      approval:"موافقة المشرف على أعضاء جدد (سياسة مستقبلية)",editOnly:"تعديل تفاصيل المجموعة للمشرف فقط (سياسة مستقبلية)",promote:"🛡️ تعيين مشرف آخر — غير متاح"}
  };
  const t=k=>(strings[$lang()]||strings.ur)[k]||k;
  const clean=(s,limit)=>typeof s==="string"?s.replace(/[\u0000-\u001f\u007f]/g," ").trim().replace(/\s+/g," ").slice(0,limit):"";
  const node=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;
    if(value!==undefined)n.textContent=value;return n;};
  function contacts(){
    let raw;
    try{raw=JSON.parse(localStorage.getItem(CONTACTS_KEY)||"[]");}catch(_){return[];}
    if(!Array.isArray(raw))return[];
    const out=[],seen=new Set();
    for(const c of raw.slice(0,50)){
      const name=clean(c?.name,40),fp=c?.fp;
      if(!FP.test(fp)||!name||seen.has(fp))continue;
      seen.add(fp);out.push({fp,name});
    }
    return out;
  }
  function read(){
    let raw;
    try{raw=JSON.parse(localStorage.getItem(GROUPS_KEY)||"[]");}catch(_){return[];}
    if(!Array.isArray(raw))return[];
    const unique=new Set(),out=[];
    for(const v of raw.slice(0,MAX_GROUPS)){
      if(!v||!ID.test(v.id)||unique.has(v.id)||!clean(v.name,MAX_TEXT)||
         !Array.isArray(v.members)||v.members.length>MAX_MEMBERS||
         !Number.isSafeInteger(v.createdAt)||v.createdAt<0)continue;
      const known=new Set(contacts().map(x=>x.fp));
      const members=[...new Set(v.members.filter(fp=>FP.test(fp)&&known.has(fp)))];
      if(!members.length)continue;
      unique.add(v.id);
      out.push({id:v.id,name:clean(v.name,MAX_TEXT),about:clean(v.about,160),
        icon:icons.includes(v.icon)?v.icon:icons[0],members,createdAt:v.createdAt,
        policy:{approveJoins:v.policy?.approveJoins!==false,adminsEditOnly:v.policy?.adminsEditOnly!==false}});
    }
    return out;
  }
  let groups=read(),selectedId=null,editId=null,notice="";
  const save=(next)=>{
    try{localStorage.setItem(GROUPS_KEY,JSON.stringify(next));groups=next;return true;}
    catch(_){notice=t("storage");return false;}
  };
  const chosen=()=>groups.find(g=>g.id===selectedId)||null;
  const $form=$("ezeroGroupForm"),$list=$("ezeroGroupsList"),$view=$("ezeroGroupView");
  function renderContacts(selected=[]){
    const box=$("ezeroGroupContacts");box.replaceChildren();
    const known=contacts();
    if(!known.length){box.append(node("p","ezero-group-empty",t("noFriends")));return;}
    known.forEach(c=>{
      const label=node("label","ezero-group-person");
      const cb=node("input");cb.type="checkbox";cb.value=c.fp;
      cb.checked=selected.includes(c.fp);cb.name="groupMember";
      const avatar=node("span","ezero-group-mini-avatar",c.name[0].toLocaleUpperCase());
      const text=node("span","ezero-group-person-name",c.name);
      label.append(cb,avatar,text);box.append(label);
    });
  }
  function openForm(existing=null){
    editId=existing?.id||null;
    $form.hidden=false;$view.hidden=true;$list.hidden=true;
    $("ezeroNewGroup").hidden=true;$("ezeroGroupFormHeading").textContent=t(existing?"edit":"new");
    $("ezeroGroupName").value=existing?.name||"";
    $("ezeroGroupAbout").value=existing?.about||"";
    $("ezeroGroupIcon").value=existing?.icon||icons[0];
    $("ezeroGroupApproveJoins").checked=existing?.policy?.approveJoins!==false;
    $("ezeroGroupAdminsEditOnly").checked=existing?.policy?.adminsEditOnly!==false;
    renderContacts(existing?.members||[]);
    $("ezeroGroupName").focus();
  }
  const showList=()=>{
    editId=null;selectedId=null;$form.hidden=true;$view.hidden=true;
    $list.hidden=false;$("ezeroNewGroup").hidden=false;render();
  };
  function openGroup(id){
    selectedId=id;
    const g=chosen();if(!g){showList();return;}
    $form.hidden=true;$list.hidden=true;$view.hidden=false;$("ezeroNewGroup").hidden=true;
    $("ezeroGroupViewIcon").textContent=g.icon;
    $("ezeroGroupViewName").textContent=g.name;
    $("ezeroGroupViewAbout").textContent=g.about;
    const label=t("members")+" · "+g.members.length;
    $("ezeroGroupMemberHeading").textContent=label;
    const membersBox=$("ezeroGroupViewMembers");membersBox.replaceChildren();
    const current=new Map(contacts().map(c=>[c.fp,c.name]));
    g.members.forEach(fp=>membersBox.append(node("li","ezero-group-member",
      (current.get(fp)||fp.slice(0,8))+" · "+fp.slice(0,8)+"…")));
    $("ezeroGroupViewTruth").textContent=t("status");
    $("ezeroGroupAdminBadge").textContent=t("admin");
    $("ezeroGroupAdminPolicy").textContent=t("policy");
  }
  function render(){
    $list.replaceChildren();
    if(!groups.length)$list.append(node("p","ezero-group-empty",t("empty")));
    groups.forEach(g=>{
      const b=node("button","ezero-group-card");
      b.type="button";
      b.setAttribute("aria-label",g.name+" · "+t("draft"));
      const icon=node("span","ezero-group-avatar",g.icon);
      const info=node("span","ezero-group-card-body");
      info.append(node("strong","",g.name),node("small","",t("draft")+" · "+g.members.length+" "+t("memberCount")));
      b.append(icon,info);b.addEventListener("click",()=>openGroup(g.id));$list.append(b);
    });
    $("ezeroGroupStatus").textContent=notice||t("source");
    $("ezeroGroupSummary").textContent=t("heading")+" · "+groups.length;
    $("ezeroGroupShortcut").textContent=t("shortcut");
    $("ezeroGroupsDescription").textContent=t("description");
    $("ezeroNewGroup").textContent=t("new");
    $("ezeroGroupFormHeading").textContent=t(editId?"edit":"new");
    $("ezeroGroupNameLabel").textContent=t("name");
    $("ezeroGroupAboutLabel").textContent=t("about");
    $("ezeroGroupIconLabel").textContent=t("icon");
    $("ezeroGroupContactsLabel").textContent=t("people");
    $("ezeroGroupSave").textContent=t("save");
    $("ezeroGroupCancel").textContent=t("cancel");
    $("ezeroGroupEdit").textContent=t("edit");
    $("ezeroGroupDelete").textContent=t("delete");
    $("ezeroGroupBack").textContent=t("back");
    $("ezeroGroupAddFriend").textContent=t("addFriend");
    $("ezeroGroupAdminSettingsLabel").textContent=t("admin");
    $("ezeroGroupAdminFormTruth").textContent=t("policy");
    $("ezeroGroupApproveJoinsLabel").textContent=t("approval");
    $("ezeroGroupAdminsEditOnlyLabel").textContent=t("editOnly");
    $("ezeroGroupPromote").textContent=t("promote");
    for(const key of ["chat","audio","video","voice"])
      $("ezeroGroup"+key[0].toUpperCase()+key.slice(1)).textContent=t(key);
    if(selectedId)openGroup(selectedId);
  }
  $("ezeroGroupShortcut").addEventListener("click",()=>{
    $("ezeroGroupsHub").open=true;
    $("ezeroGroupsHub").scrollIntoView({behavior:"smooth",block:"start"});
  });
  $("ezeroNewGroup").addEventListener("click",()=>openForm());
  $("ezeroGroupCancel").addEventListener("click",showList);
  $("ezeroGroupBack").addEventListener("click",showList);
  $("ezeroGroupEdit").addEventListener("click",()=>{const g=chosen();if(g)openForm(g);});
  $("ezeroGroupDelete").addEventListener("click",()=>{
    const g=chosen();if(!g||!window.confirm(t("confirm")))return;
    if(save(groups.filter(x=>x.id!==g.id))){notice=t("deleted");showList();}
    else render();
  });
  $form.addEventListener("submit",event=>{
    event.preventDefault();
    const name=clean($("ezeroGroupName").value,MAX_TEXT);
    const about=clean($("ezeroGroupAbout").value,160);
    const icon=$("ezeroGroupIcon").value;
    const available=new Set(contacts().map(x=>x.fp));
    const members=[...new Set([...$("ezeroGroupContacts").querySelectorAll('input[type="checkbox"]:checked')]
      .map(el=>el.value).filter(fp=>FP.test(fp)&&available.has(fp)))];
    if(!name||!members.length){notice=t("invalid");$("ezeroGroupStatus").textContent=notice;return;}
    if(members.length>MAX_MEMBERS||(!editId&&groups.length>=MAX_GROUPS)){
      notice=t("full");$("ezeroGroupStatus").textContent=notice;return;
    }
    const old=editId?groups.find(g=>g.id===editId):null;
    if(editId&&!old){showList();return;}
    const id=old?.id||Array.from(crypto.getRandomValues(new Uint8Array(16)),
      b=>b.toString(16).padStart(2,"0")).join("");
    const g={id,name,about,icon:icons.includes(icon)?icon:icons[0],
      members,createdAt:old?.createdAt||Date.now(),
      policy:{approveJoins:$("ezeroGroupApproveJoins").checked,
        adminsEditOnly:$("ezeroGroupAdminsEditOnly").checked}};
    const next=old?groups.map(x=>x.id===old.id?g:x):[g,...groups];
    if(!save(next)){$("ezeroGroupStatus").textContent=notice;return;}
    notice=t(old?"updated":"saved");
    showList();openGroup(g.id);
  });
  $("language")?.addEventListener("change",()=>{
    if(!$form.hidden)renderContacts([...$("ezeroGroupContacts")
      .querySelectorAll('input[type="checkbox"]:checked')].map(el=>el.value));
    render();
  });
  document.addEventListener("ezero:friend-verification",()=>{if(!$form.hidden)renderContacts();});
  window.addEventListener("storage",event=>{
    if(event.key===GROUPS_KEY||event.key===CONTACTS_KEY){
      groups=read();notice="";showList();
    }
  });
  render();
})();
