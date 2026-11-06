/* E-ZERO local block/delete controls (bounded browser-origin deny list).
 * A block is unilateral, revocable and effective across saved-contact calls,
 * received saved-friend invitations and verified signed QR signaling.
 * Neither deleting nor blocking claims to delete data on the other device.
 */
(()=>{"use strict";
const KEY="ezero_secure_connect_blocked_peer_fingerprints_v0_1";
const FRIENDS="ezero_secure_connect_staging_fingerprints_v0_1";
const FP=/^[a-f0-9]{64}$/;
const LIMIT=100;
function read(){
 try{
   const a=JSON.parse(localStorage.getItem(KEY)||"[]");
   if(!Array.isArray(a))return[];
   return [...new Set(a.filter(x=>typeof x==="string"&&FP.test(x)))].slice(0,LIMIT);
 }catch(_){return[];}
}
function emit(fp,action){
 document.dispatchEvent(new CustomEvent("ezero:friend-access-updated",{
   detail:{fp,action}
 }));
}
function isBlocked(fp){return FP.test(fp)&&read().includes(fp);}
function removeLocal(fp){
 if(!FP.test(fp))return false;
 try{
   const source=JSON.parse(localStorage.getItem(FRIENDS)||"[]");
   if(!Array.isArray(source))return false;
   const next=source.filter(x=>x?.fp!==fp);
   localStorage.setItem(FRIENDS,JSON.stringify(next));
   document.dispatchEvent(new CustomEvent("ezero:friend-local-removed",{
     detail:{fp}
   }));
   return true;
 }catch(_){return false;}
}
function block(fp){
 if(!FP.test(fp))return false;
 try{
   const list=read();
   if(!list.includes(fp)){
     if(list.length>=LIMIT)return false;
     localStorage.setItem(KEY,JSON.stringify([fp,...list]));
   }
   // A block takes effect even if the separate local friend removal fails.
   removeLocal(fp);
   emit(fp,"blocked");
   return true;
 }catch(_){return false;}
}
function unblock(fp){
 if(!FP.test(fp))return false;
 try{
   localStorage.setItem(KEY,JSON.stringify(read().filter(x=>x!==fp)));
   emit(fp,"unblocked");
   return true;
 }catch(_){return false;}
}
function remove(fp){
 if(!FP.test(fp))return false;
 if(!removeLocal(fp))return false;
 emit(fp,"removed");return true;
}
window.EZERO_FRIEND_ACCESS=Object.freeze({
 isBlocked,block,unblock,remove,listBlocked:read
});
})();