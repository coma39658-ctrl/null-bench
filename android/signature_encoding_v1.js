// Convert strict ASN.1 DER ECDSA P-256 signatures (Android/JCA) to
// WebCrypto's fixed-width IEEE-P1363 r||s wire encoding.
export function derEcdsaP256ToP1363(der) {
  if (!(der instanceof Uint8Array) || der.length < 8 || der.length > 72) throw new Error("DER_SIGNATURE_SIZE");
  let p=0;
  const byte=()=>{if(p>=der.length)throw new Error("DER_TRUNCATED");return der[p++];};
  if(byte()!==0x30)throw new Error("DER_SEQUENCE");
  const seqLen=byte();
  if(seqLen!==der.length-2)throw new Error("DER_SEQUENCE_LENGTH");
  function integer(){
    if(byte()!==0x02)throw new Error("DER_INTEGER");
    const len=byte();
    if(len<1 || len>33 || p+len>der.length)throw new Error("DER_INTEGER_LENGTH");
    let v=der.slice(p,p+len);p+=len;
    if(v[0]&0x80)throw new Error("DER_NEGATIVE_INTEGER");
    if(v.length>1 && v[0]===0){if(!(v[1]&0x80))throw new Error("DER_REDUNDANT_ZERO");v=v.slice(1);}
    if(v.length>32)throw new Error("DER_INTEGER_OVERFLOW");
    const out=new Uint8Array(32);out.set(v,32-v.length);return out;
  }
  const r=integer(),s=integer();
  if(p!==der.length)throw new Error("DER_TRAILING_DATA");
  const out=new Uint8Array(64);out.set(r,0);out.set(s,32);return out;
}
