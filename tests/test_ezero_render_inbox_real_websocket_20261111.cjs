/* Real local Cloudflare Worker WebSocket handshake and signed two-client delivery. */
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');
const crypto=webcrypto;
const origin='https://ezero-secure-app-two-phone-test-20261107.onrender.com';
const b64=b=>Buffer.from(b).toString('base64url');
const hex=b=>Buffer.from(b).toString('hex');
const timeout=ms=>new Promise((_,reject)=>setTimeout(()=>reject(Error('WebSocket timeout')),ms));
async function identity(){
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
 const pub=new Uint8Array(await crypto.subtle.exportKey('spki',pair.publicKey));
 return {key:pair.privateKey,pub:b64(pub),fp:hex(await crypto.subtle.digest('SHA-256',pub))};
}
async function connect(target,person,role){
 const ws=new WebSocket('ws://127.0.0.1:8788/v1/trusted/'+target,{headers:{Origin:origin}});
 const queue=[];const waiters=[];
 ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(waiters.length)waiters.shift()(m);else queue.push(m)});
 const next=()=>Promise.race([queue.length?Promise.resolve(queue.shift()):new Promise(resolve=>waiters.push(resolve)),timeout(7000)]);
 await Promise.race([new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})}),timeout(7000)]);
 const challenge=await next();
 assert.equal(challenge.t,'challenge');
 assert.equal(challenge.target,target);
 const payload=['EZERO-TRUSTED-INBOX-1',origin,target,role,person.fp,challenge.nonce,String(challenge.opened)].join('\n');
 const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},person.key,new TextEncoder().encode(payload));
 ws.send(JSON.stringify({t:'hello',role,fp:person.fp,pub:person.pub,sig:b64(sig)}));
 return {ws,next};
}
(async()=>{
 assert.equal(typeof WebSocket,'function','Node WebSocket client unavailable');
 const owner=await identity(),caller=await identity();
 const a=await connect(owner.fp,owner,'owner');
 assert.equal((await a.next()).t,'ready');
 a.ws.send(JSON.stringify({t:'trust',fp:caller.fp}));
 assert.deepEqual(await a.next(),{t:'trust-updated',fp:caller.fp,trusted:true});
 const b=await connect(owner.fp,caller,'caller');
 assert.equal((await b.next()).t,'ready');
 const callId='a'.repeat(32);
 const invite=origin+'/ezero_trusted_friends_staging_20261106.html?mode=audio#room='+'b'.repeat(32)+'.'+'c'.repeat(43);
 b.ws.send(JSON.stringify({t:'call',callId,kind:'audio',invite}));
 const incoming=await a.next();
 assert.equal(incoming.t,'incoming');assert.equal(incoming.from,caller.fp);
 assert.equal(incoming.callId,callId);assert.equal(incoming.invite,invite);
 a.ws.send(JSON.stringify({t:'received',callId,from:caller.fp}));
 assert.deepEqual(await b.next(),{t:'delivered-to-active-tab',callId});
 a.ws.close();b.ws.close();
 console.log('REAL_LOCAL_WEBSOCKET_TWO_CLIENT_SIGNED_DELIVERY_PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
