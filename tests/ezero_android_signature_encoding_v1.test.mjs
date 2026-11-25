import test from "node:test";
import assert from "node:assert/strict";
import { createSign, generateKeyPairSync, webcrypto } from "node:crypto";
import { derEcdsaP256ToP1363 } from "../android/signature_encoding_v1.js";

test("Android/JCA DER signature converts to WebCrypto P1363 and verifies", async()=>{
  const {privateKey,publicKey}=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
  const data=Buffer.from("E-ZERO cross-platform signature encoding v1");
  const der=createSign("SHA256").update(data).end().sign(privateKey);
  const p1363=derEcdsaP256ToP1363(new Uint8Array(der));
  assert.equal(p1363.length,64);
  const imported=await webcrypto.subtle.importKey("spki",publicKey.export({type:"spki",format:"der"}),{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
  assert.equal(await webcrypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},imported,p1363,data),true);
});

test("DER converter rejects malformed, negative, oversized and trailing data",()=>{
  for (const value of [new Uint8Array(),new Uint8Array([0x30,0]),new Uint8Array([0x30,6,2,1,0x80,2,1,1]),new Uint8Array([0x30,7,2,2,0,1,2,1,1]),new Uint8Array([0x30,6,2,1,1,2,1,1,0])])
    assert.throws(()=>derEcdsaP256ToP1363(value));
});

test("Worker requires 64-byte P1363 signatures, not variable-length DER",async()=>{
  const {readFileSync}=await import("node:fs");
  const src=readFileSync("signaling/cloudflare/src/android_enrollment_candidate_v1.js","utf8");
  assert.match(src,/sig\.length !== 64/);
  assert.match(src,/deviceSig\.length !== 64 \|\| rootSig\.length !== 64/);
});
