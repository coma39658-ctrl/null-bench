/* E-ZERO browser owner-key approval — isolated staging only.
 * Signs a short-lived Android call-invite-only binding request with the SAME
 * non-extractable P-256 key that produced the user's permanent EZERO2 QR.
 * No key export, network request, persistence, contact sync, or call setup.
 */
(()=>{"use strict";
 const ORIGIN="https://coma39658-ctrl.github.io";
 const REQUEST_DOMAIN="EZERO-ANDROID-BIND-1";
 const APPROVAL_DOMAIN="EZERO-ANDROID-BIND-APPROVAL-1";
 const encoder=new TextEncoder();
 const approvedNonces=new Set();
 const decode=s=>{
   if(typeof s!=="string"||! /^[A-Za-z0-9_-]{40,240}$/.test(s))throw Error("BAD_BASE64URL");
   const raw=atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4));
   return Uint8Array.from(raw,c=>c.charCodeAt(0));
 };
 const encode=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("");
 const fpOf=async bytes=>hex(await crypto.subtle.digest("SHA-256",bytes));
 function parseCanonicalRequest(canonical){
   if(typeof canonical!=="string"||canonical.length>1200||canonical.includes("\r"))throw Error("BAD_REQUEST");
   const lines=canonical.split("\n");
   if(lines.length!==9||lines[0]!==REQUEST_DOMAIN||lines[1]!==ORIGIN||lines[8]!=="call-invite-only")throw Error("REQUEST_SCOPE_MISMATCH");
   const [protocol,origin,ownerFp,androidSpki,androidFp,nonce,issuedText,expiresText,capability]=lines;
   if(!/^[a-f0-9]{64}$/.test(ownerFp)||!/^[a-f0-9]{64}$/.test(androidFp))throw Error("BAD_FINGERPRINT");
   if(!/^[A-Za-z0-9_-]{40,240}$/.test(androidSpki)||!/^[A-Za-z0-9_-]{16,128}$/.test(nonce))throw Error("BAD_KEY_OR_NONCE");
   if(!/^(0|[1-9][0-9]*)$/.test(issuedText)||!/^(0|[1-9][0-9]*)$/.test(expiresText))throw Error("BAD_TIME");
   const issued=Number(issuedText),expires=Number(expiresText),now=Math.floor(Date.now()/1000);
   if(!Number.isSafeInteger(issued)||!Number.isSafeInteger(expires)||expires<=issued||expires-issued>90||issued>now+30||expires<=now)throw Error("REQUEST_EXPIRED_OR_INVALID");
   const rebuilt=[protocol,origin,ownerFp,androidSpki,androidFp,nonce,issuedText,expiresText,capability].join("\n");
   if(rebuilt!==canonical)throw Error("NON_CANONICAL_REQUEST");
   return {origin,ownerFp,androidSpki,androidFp,nonce,issued,expires,capability};
 }
 async function approveAndroidBindingRequest(canonicalRequest){
   const request=parseCanonicalRequest(canonicalRequest);
   const nonceKey=request.ownerFp+":"+request.nonce;
   if(approvedNonces.has(nonceKey))throw Error("CHALLENGE_REPLAYED");
   const store=window.EZERO_DEVICE_IDENTITY_STORE;
   const qr=window.EZERO_PERMANENT_IDENTITY_QR;
   if(!store||typeof store.read!=="function"||!qr||typeof qr.verify!=="function")throw Error("OWNER_IDENTITY_API_UNAVAILABLE");
   const owner=await store.read();
   if(!owner||owner.fingerprint!==request.ownerFp||!owner.permanentProof)throw Error("OWNER_KEY_NOT_ENROLLED");
   if(owner.keys?.privateKey?.extractable!==false||owner.keys?.privateKey?.algorithm?.name!=="ECDSA"||owner.keys?.privateKey?.algorithm?.namedCurve!=="P-256"||!owner.keys.privateKey.usages?.includes("sign"))throw Error("OWNER_PRIVATE_KEY_INVALID");
   await qr.verify(owner,owner.permanentProof);
   const androidSpki=decode(request.androidSpki);
   const androidKey=await crypto.subtle.importKey("spki",androidSpki,{name:"ECDSA",namedCurve:"P-256"},true,["verify"]);
   if(androidKey.algorithm?.namedCurve!=="P-256")throw Error("ANDROID_KEY_NOT_P256");
   if(await fpOf(androidSpki)!==request.androidFp)throw Error("ANDROID_FINGERPRINT_MISMATCH");
   const message="E-ZERO is asking to add this Android installation as a call-invite-only device.\nOwner fingerprint: "+request.ownerFp+"\nAndroid fingerprint: "+request.androidFp+"\nThis does not share contacts, messages, photos, audio, video, or call history.";
   if(typeof window.confirm!=="function"||window.confirm(message)!==true)throw Error("OWNER_APPROVAL_DECLINED");
   const bytes=encoder.encode(APPROVAL_DOMAIN+"\n"+canonicalRequest);
   const signature=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},owner.keys.privateKey,bytes);
   approvedNonces.add(nonceKey);
   return Object.freeze({
     protocol:APPROVAL_DOMAIN,
     origin:request.origin,
     ownerFingerprint:request.ownerFp,
     androidFingerprint:request.androidFp,
     nonce:request.nonce,
     issuedAtEpochSeconds:request.issued,
     expiresAtEpochSeconds:request.expires,
     capability:request.capability,
     signatureBase64Url:encode(signature)
   });
 }
 window.EZERO_ANDROID_BINDING_OWNER_APPROVAL_V1=Object.freeze({
   approve:approveAndroidBindingRequest,
   parseRequest:parseCanonicalRequest
 });
})();