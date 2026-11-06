import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {PairV1SqliteChallengeLedgerLab as Ledger,CHALLENGE_MAX_AGE_MS}
 from "../secure_connect/pair_v1/pair_challenge_sqlite_lab_v0_1.mjs";
const root=mkdtempSync(join(tmpdir(),"ezero_pair_sqlite_test_"));
const file=join(root,"durable-test.sqlite3");
const makeStore=db=>({
 sql:{exec(query,...params){
  const q=query.trim();
  if(q.startsWith("CREATE TABLE")){db.exec(q);return {toArray:()=>[]};}
  const stmt=db.prepare(q);
  if(q.startsWith("SELECT")||q.includes("RETURNING"))
   return {toArray:()=>stmt.all(...params)};
  stmt.run(...params);return {toArray:()=>[]};
 }},
 transactionSync(fn){
  db.exec("BEGIN IMMEDIATE");
  try{const result=fn();db.exec("COMMIT");return result;}
  catch(error){db.exec("ROLLBACK");throw error;}
 }
});
const now=Date.now();
const challenge={
 sessionId:"a".repeat(32),nonceDigest:"b".repeat(64),
 accountId:"account_test_001",credentialId:"credential_es256_A",
 purpose:"PAIR_OR_RECONNECT",issued:now,expires:now+80_000
};
let db;
try{
 db=new DatabaseSync(file);
 const first=new Ledger(makeStore(db));
 const issued=first.issue(challenge,now);
 assert.equal(issued.ok,true);assert.equal(issued.authorized,false);
 assert.deepEqual(first.issue(challenge,now),
  {ok:false,authorized:false,code:"SESSION_ALREADY_EXISTS"});
 for(const field of [
  {nonceDigest:"c".repeat(64)},
  {accountId:"different_account"},
  {credentialId:"credential_es256_B"},
  {sessionId:"d".repeat(32)}
 ]){
  const r=first.consume({...challenge,...field},now+10);
  assert.equal(r.ok,false);assert.equal(r.authorized,false);
 }
 assert.equal(first.consume({...challenge,purpose:"OBD_CONTROL"},now+10).ok,false);
 assert.equal(first.consume({...challenge},now+80_000).ok,false,"Expired challenge denied");
 // Key property of a durable ledger: instance process can disappear and
 // the stored challenge remains in SQLite; no in-memory retry bypass.
 db.close();
 db=new DatabaseSync(file);
 const second=new Ledger(makeStore(db));
 const accepted=second.consume(challenge,now+20);
 assert.deepEqual(accepted,{
  ok:true,code:"CHALLENGE_CONSUMED_ONCE_LAB",
  authorized:false,challengeConsumed:true
 });
 assert.deepEqual(second.consume(challenge,now+21),{
  ok:false,code:"CHALLENGE_REJECTED_OR_REPLAYED",authorized:false
 });
 db.close();
 db=new DatabaseSync(file);
 const third=new Ledger(makeStore(db));
 assert.equal(third.consume(challenge,now+22).ok,false,"Replay denied after reopening database");
 assert.equal(CHALLENGE_MAX_AGE_MS,90_000);
 console.log("PAIR_V1_SQLITE_PERSISTENT_ONE_TIME_CHALLENGE_ACROSS_RESTART_REPLAY_DENIED: PASS");
 const next={...challenge,sessionId:"c".repeat(32),nonceDigest:"f".repeat(64)};
 assert.equal(third.issue(next,now).ok,true);
 const outcomes=await Promise.all(Array.from({length:20},async()=>third.consume(next,now+23)));
 assert.equal(outcomes.filter(x=>x.ok).length,1,"Single consume under concurrent requests");
 assert.equal(outcomes.filter(x=>!x.ok).length,19);
 assert.equal(outcomes.filter(x=>x.authorized).length,0);
 console.log("PAIR_V1_SQLITE_CAS_ATOMIC_CONSUME_ONE_WINNER_TWENTY_REQUESTS: PASS");
 for(const changes of [
  {sessionId:"x"},{nonceDigest:"bad"},{accountId:"!"},
  {credentialId:"a"},{purpose:"ECU_WRITE"},{issued:now+40_000},
  {expires:now-1},{expires:now+90_001},{expires:now},
 ]){
  assert.equal(third.issue({...challenge,...changes,sessionId:changes.sessionId??"d".repeat(32)},now).ok,false);
 }
 assert.equal(third.consume({...challenge,accountId:"another_account"},now+24).ok,false);
 assert.throws(()=>new Ledger({sql:{exec:()=>({})}}),/SQLITE_TRANSACTION_REQUIRED/);
 console.log("PAIR_V1_SQLITE_BAD_TTL_CROSS_ACCOUNT_WRONG_PURPOSE_FAIL_CLOSED: PASS");
}finally{
 try{db?.close();}catch(_){}
 rmSync(root,{recursive:true,force:true});
}
