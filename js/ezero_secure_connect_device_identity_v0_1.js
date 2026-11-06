/* E-ZERO saved-device identity v0.1 (isolated branch).
 * An opt-in, non-extractable P-256 private CryptoKey is persisted only in
 * browser-origin IndexedDB. Never place private keys in localStorage, URLs,
 * signaling payloads, QR codes or server data.
 *
 * This is a local trusted-device prerequisite, NOT a remote call inbox.
 */
(() => {
  "use strict";
  const DB_NAME="ezero_secure_connect_device_identity_staging_v0_1";
  const STORE_NAME="device";
  const KEY="current";
  function openDb(){
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window))return reject(Error("STORAGE_UNAVAILABLE"));
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME);
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(Error("STORAGE_OPEN_FAILED"));
      request.onblocked=()=>reject(Error("STORAGE_BLOCKED"));
    });
  }
  async function transaction(mode,action,value){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      let result;
      let settled=false;
      const fail=()=>{
        if(settled)return;
        settled=true;
        try{db.close();}catch(_){}
        reject(Error("STORAGE_TRANSACTION_FAILED"));
      };
      try{
        const tx=db.transaction(STORE_NAME,mode);
        const store=tx.objectStore(STORE_NAME);
        const req=action==="put"?store.put(value,KEY):
          action==="delete"?store.delete(KEY):store.get(KEY);
        req.onsuccess=()=>{result=req.result;};
        req.onerror=fail;
        tx.onerror=fail;
        tx.onabort=fail;
        tx.oncomplete=()=>{
          if(settled)return;
          settled=true;
          db.close();
          resolve(action==="get"?(result??null):true);
        };
      }catch(_){fail();}
    });
  }
  const validRecord=r=>!!r&&typeof r==="object"&&r.v===1&&
    typeof r.spki==="string"&&/^[A-Za-z0-9_-]{50,240}$/.test(r.spki)&&
    typeof r.fingerprint==="string"&&/^[a-f0-9]{64}$/.test(r.fingerprint)&&
    r.keys?.publicKey?.type==="public"&&r.keys?.privateKey?.type==="private"&&
    r.keys.privateKey.extractable===false&&
    r.keys.privateKey.algorithm?.name==="ECDSA"&&
    r.keys.privateKey.algorithm?.namedCurve==="P-256"&&
    r.keys.privateKey.usages?.includes("sign")&&
    r.keys.publicKey.algorithm?.name==="ECDSA"&&
    r.keys.publicKey.usages?.includes("verify");
  window.EZERO_DEVICE_IDENTITY_STORE=Object.freeze({
    async read(){
      const row=await transaction("readonly","get");
      return validRecord(row)?row:null;
    },
    async save(keys,spki,fingerprint){
      const row={v:1,keys,spki,fingerprint};
      if(!validRecord(row))throw Error("INVALID_DEVICE_IDENTITY");
      return transaction("readwrite","put",row);
    },
    async forget(){return transaction("readwrite","delete");}
  });
})();