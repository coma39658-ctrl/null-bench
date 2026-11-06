/*
 * E-ZERO Trusted Friends foreground inbox browser client V0.1.
 * EXPERIMENTAL; not loaded by public site, not deployed.
 * The public QR call flow remains unchanged. Caller explicitly starts each
 * call; recipient must approve in the existing WebRTC call page.
 *
 * Requires a consent-saved non-exportable P-256 key from Phase A IndexedDB
 * (window.EZERO_DEVICE_IDENTITY_STORE); no private key, profile, SDP, audio,
 * video or chat is ever transferred to this inbox. A browser tab must be open.
 */
(() => {
  "use strict";
  const ORIGIN="https://coma39658-ctrl.github.io";
  const CALL_PAGE="/null-bench/ezero_trusted_friends_staging_20261106.html";
  const FP=/^[a-f0-9]{64}$/;
  const ROOM=/^#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/;
  const CONFIG=window.EZERO_TRUSTED_INBOX_CONFIG;
  const CONTACTS="ezero_secure_connect_local_fingerprints_v0_1";
  const encoder=new TextEncoder();
  const MAX_WAIT=15000;
  const state={owner:null,identity:null,waiting:new Set(),pendingReceipts:new Map()};
  const events=new EventTarget();

  function validUrl(value,mode){
    if(typeof value!=="string"||value.length>240)return false;
    try{
      const u=new URL(value);
      return u.origin===ORIGIN&&u.pathname===CALL_PAGE&&
        u.searchParams.size===1&&u.searchParams.get("mode")===mode&&ROOM.test(u.hash);
    }catch(_){return false;}
  }
  function ready(){
    return CONFIG?.enabled===true&&
      /^wss:\/\/[a-z0-9.-]+(?::443)?$/i.test(CONFIG.websocketOrigin||"")&&
      location.origin===ORIGIN&&window.isSecureContext===true&&
      !!crypto?.subtle;
  }
  function contacts(){
    try{
      const arr=JSON.parse(localStorage.getItem(CONTACTS)||"[]");
      if(!Array.isArray(arr))return [];
      return arr.slice(0,50).filter(x=>x&&FP.test(x.fp)&&
        typeof x.name==="string"&&x.name.trim().length>0&&x.name.length<=40);
    }catch(_){return [];}
  }
  function friend(fp){return contacts().find(x=>x.fp===fp)||null;}
  function emit(type,detail){
    events.dispatchEvent(new CustomEvent(type,{detail}));
  }
  function b64url(bytes){
    let str="";
    for(const b of bytes)str+=String.fromCharCode(b);
    return btoa(str).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  function hex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");}
  async function loadIdentity(){
    if(!ready())throw Error("LAB_DISABLED_OR_INSECURE");
    const store=window.EZERO_DEVICE_IDENTITY_STORE;
    if(!store?.read)throw Error("DEVICE_IDENTITY_STORE_NOT_LOADED");
    const row=await store.read();
    if(!row?.keys?.privateKey||row.keys.privateKey.extractable!==false||
       row.keys.privateKey.algorithm?.name!=="ECDSA"||
       row.keys.privateKey.algorithm?.namedCurve!=="P-256"||
       !FP.test(row.fingerprint||""))throw Error("DEVICE_IDENTITY_NOT_SAVED");
    const publicBytes=new Uint8Array(await crypto.subtle.exportKey("spki",row.keys.publicKey));
    const fp=hex(new Uint8Array(await crypto.subtle.digest("SHA-256",publicBytes)));
    if(fp!==row.fingerprint||b64url(publicBytes)!==row.spki)
      throw Error("DEVICE_IDENTITY_MISMATCH");
    state.identity=row;
    return row;
  }
  function socketUrl(target){
    if(!FP.test(target))throw Error("INVALID_FINGERPRINT");
    return CONFIG.websocketOrigin+"/v1/trusted/"+target;
  }
  async function connect(role,target,onData){
    if(!["owner","caller"].includes(role)||!FP.test(target))
      throw Error("INVALID_TARGET");
    const id=await loadIdentity();
    if(role==="owner"&&id.fingerprint!==target)throw Error("OWNER_MISMATCH");
    if(role==="caller"&&id.fingerprint===target)throw Error("SELF_CALL");
    const ws=new WebSocket(socketUrl(target));
    return new Promise((resolve,reject)=>{
      let settled=false,authenticated=false,closed=false;
      const timer=setTimeout(()=>fail("INBOX_TIMEOUT"),MAX_WAIT);
      const clear=()=>clearTimeout(timer);
      function fail(code){
        if(!settled){settled=true;clear();reject(Error(code));}
        if(!closed){try{ws.close();}catch(_){}}
      }
      ws.addEventListener("message",async event=>{
        if(typeof event.data!=="string"||event.data.length>1200)
          return fail("INVALID_INBOX_MESSAGE");
        let m;
        try{m=JSON.parse(event.data);}catch(_){return fail("BAD_JSON");}
        if(!m||typeof m!=="object")return fail("BAD_RESPONSE");
        if(m.t==="challenge"){
          if(authenticated||!(/^[A-Za-z0-9_-]{32}$/.test(m.nonce||""))||
             m.target!==target||!Number.isSafeInteger(m.opened)||
             !Number.isSafeInteger(m.expires)||
             m.expires-m.opened!==20000||Date.now()>m.expires||
             Math.abs(Date.now()-m.opened)>30000)return fail("BAD_CHALLENGE");
          authenticated=true;
          try{
            const msg=["EZERO-TRUSTED-INBOX-1",ORIGIN,target,role,
              id.fingerprint,m.nonce,String(m.opened)].join("\n");
            const signed=await crypto.subtle.sign(
              {name:"ECDSA",hash:"SHA-256"},id.keys.privateKey,encoder.encode(msg));
            if(ws.readyState!==WebSocket.OPEN)return fail("INBOX_DISCONNECTED");
            ws.send(JSON.stringify({t:"hello",role,fp:id.fingerprint,
              pub:id.spki,sig:b64url(new Uint8Array(signed))}));
          }catch(_){fail("IDENTITY_SIGN_FAILED");}
          return;
        }
        if(m.t==="ready"&&m.role===role){
          if(!authenticated)return fail("NOT_AUTHENTICATED");
          if(!settled){settled=true;clear();resolve(ws);}
          return;
        }
        if(!settled)return fail("SERVER_NOT_READY");
        if(m.t==="incoming"&&role==="owner"){
          if(!FP.test(m.from||"")||
             !/^[a-f0-9]{32}$/.test(m.callId||"")||
             !["audio","video"].includes(m.kind)||
             !validUrl(m.invite,m.kind))return;
          const known=friend(m.from);
          if(!known){emit("unrecognized",{from:m.from});return;}
          // Parsing a valid frame is not evidence that a call card was drawn.
          // Only the trusted UI may explicitly confirm after rendering.
          const now=Date.now();
          for(const [id,p] of state.pendingReceipts){
            if(now-p.at>MAX_WAIT)state.pendingReceipts.delete(id);
          }
          if(state.pendingReceipts.size>=8)
            state.pendingReceipts.delete(state.pendingReceipts.keys().next().value);
          state.pendingReceipts.set(m.callId,{from:m.from,at:now});
          try{
            onData?.({type:"incoming",from:m.from,name:known.name,
              kind:m.kind,invite:m.invite,callId:m.callId});
          }catch(_){
            state.pendingReceipts.delete(m.callId);
            emit("incoming-error",{code:"INCOMING_DISPLAY_FAILED"});
          }
        }else if(m.t==="trust-updated"&&role==="owner"){
          onData?.({type:"trust-updated",fp:m.fp,trusted:m.trusted===true});
        }else if(m.t==="delivered-to-active-tab"&&role==="caller"){
          onData?.({type:"delivered",callId:m.callId});
        }else if(m.t==="error"){
          onData?.({type:"error",code:String(m.code||"INBOX_ERROR").slice(0,50)});
        }
      });
      ws.addEventListener("close",()=>{
        closed=true;clear();
        if(!settled){settled=true;reject(Error("INBOX_CLOSED"));}
        if(role==="owner"&&state.owner===ws){
          state.owner=null;
          state.pendingReceipts.clear();
          emit("offline",{reason:"socket-closed"});
        }
      });
      ws.addEventListener("error",()=>{if(!settled)fail("INBOX_NETWORK_ERROR");});
    });
  }
  async function openOwnerInbox(){
    if(state.owner?.readyState===WebSocket.OPEN)return true;
    const id=await loadIdentity();
    const ws=await connect("owner",id.fingerprint,packet=>{
      emit(packet.type,packet);
    });
    state.owner=ws;
    emit("inbox-online",{});
    return true;
  }
  function confirmIncomingVisible(from,callId){
    if(!FP.test(from)||!/^[a-f0-9]{32}$/.test(callId))
      throw Error("INVALID_RECEIPT");
    const pending=state.pendingReceipts.get(callId);
    if(!pending||pending.from!==from||Date.now()-pending.at>MAX_WAIT)
      throw Error("NO_PENDING_VISIBLE_INVITE");
    if(!friend(from))throw Error("FRIEND_NOT_VERIFIED_LOCALLY");
    if(state.owner?.readyState!==WebSocket.OPEN)
      throw Error("OWNER_INBOX_OFFLINE");
    // The caller receives only a delivery receipt, never an auto-accept.
    state.owner.send(JSON.stringify({t:"received",from,callId}));
    state.pendingReceipts.delete(callId);
    return true;
  }
  async function setFriendTrust(fp,allowed){
    if(!FP.test(fp))throw Error("INVALID_FINGERPRINT");
    if(typeof allowed!=="boolean")throw Error("EXPLICIT_TRUST_CHOICE_REQUIRED");
    // Revocation must remain possible even after a local contact was deleted.
    if(allowed&&!friend(fp))throw Error("FRIEND_NOT_VERIFIED_LOCALLY");
    if(state.owner?.readyState!==WebSocket.OPEN)throw Error("OWNER_INBOX_OFFLINE");
    // Call only from an explicit user gesture after peer verification.
    state.owner.send(JSON.stringify({t:allowed?"trust":"untrust",fp}));
  }
  async function callSavedFriend(fp,mode,invite){
    if(!FP.test(fp)||!friend(fp))throw Error("FRIEND_NOT_VERIFIED_LOCALLY");
    if(!["audio","video"].includes(mode)||!validUrl(invite,mode))
      throw Error("FRESH_SIGNED_QR_INVITE_REQUIRED");
    // This method only relays an existing, user-generated fresh invitation.
    // Caller does not get a false Connected status; the real WebRTC engine
    // must still validate SDP, fingerprints and the answer.
    if(state.waiting.has(fp))throw Error("CALL_ALREADY_PENDING");
    state.waiting.add(fp);
    let ws;
    try{
      const id=await loadIdentity();
      if(fp===id.fingerprint)throw Error("SELF_CALL");
      ws=await connect("caller",fp,p=>emit("outgoing-"+p.type,p));
      const callId=hex(crypto.getRandomValues(new Uint8Array(16)));
      ws.send(JSON.stringify({t:"call",kind:mode,callId,invite}));
      emit("outgoing-sent",{to:fp,callId});
      return callId;
    }finally{
      state.waiting.delete(fp);
      // Caller's inbox socket is kept alive until server acknowledgement;
      // the WebRTC call uses a separate 10-minute signaling room.
      if(ws){
        const ref=ws;
        let completed=false;
        const close=()=>{try{ref.close();}catch(_){}};
        ws.addEventListener("message",e=>{
          try{
            const data=JSON.parse(e.data);
            if(data?.t==="delivered-to-active-tab"||data?.t==="error"){
              completed=true;
              close();
            }
          }catch(_){}
        });
        ws.addEventListener("close",()=>{
          if(completed)return;
          completed=true;
          emit("outgoing-error",{code:"INBOX_CLOSED_BEFORE_RECEIPT"});
        });
        setTimeout(()=>{
          if(completed)return;
          completed=true;
          // A disconnected socket is also a failure, not indefinite "sent".
          emit("outgoing-error",{code:"DELIVERY_RECEIPT_TIMEOUT"});
          close();
        },MAX_WAIT);
      }
    }
  }
  function closeOwnerInbox(){
    const ws=state.owner;state.owner=null;
    state.pendingReceipts.clear();
    try{ws?.close();}catch(_){}
  }
  // No WebSocket or persistent identity initialization happens on page load.
  window.EZERO_TRUSTED_FRIEND_LAB=Object.freeze({
    enabled:ready,
    on:(event,callback)=>events.addEventListener(event,callback),
    off:(event,callback)=>events.removeEventListener(event,callback),
    openOwnerInbox,setFriendTrust,callSavedFriend,closeOwnerInbox,
    confirmIncomingVisible,safeInvite:validUrl
  });
})();