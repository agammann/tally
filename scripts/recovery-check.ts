import './env';
import {qa,saveQa} from './qa-state';
import {PrismaClient} from '@prisma/client';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PrismaClient({log:[]});
const origin='http://localhost:3000';
const login=(password:string)=>fetch(origin+'/api/auth/sign-in/email',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:qa.email,password})});
async function main(){
 const owner=await db.user.findUnique({where:{email:qa.email}});assert.ok(owner&&qa.email.endsWith('@tally-test.invalid'),'Only disposable QA owner permitted');
 await db.rateLimit.deleteMany();
 const signed=await login(qa.password);assert.equal(signed.status,200);const cookie=signed.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 const count=await db.project.count({where:{ownerId:owner.id}});const password=randomBytes(24).toString('base64url');
 await new Promise<void>((resolve,reject)=>{const p=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/recover.ts'],{env:{...process.env,TALLY_OWNER_EMAIL:qa.email,TALLY_OWNER_PASSWORD:password},stdio:'pipe'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error('Recovery command failed')));});
 assert.equal((await fetch(origin+'/api/projects',{headers:{Cookie:cookie}})).status,401);
 assert.equal((await login(qa.password)).status,401);assert.equal((await login(password)).status,200);
 assert.equal(await db.project.count({where:{ownerId:owner.id}}),count);qa.password=password;saveQa();
 await db.rateLimit.deleteMany();
 const evidence={checkedAt:new Date().toISOString(),oldSessionRevoked:true,oldPasswordRejected:true,newPasswordAccepted:true,projectsPreserved:count};writeFileSync('work/recovery-results.json',JSON.stringify(evidence,null,2));console.log(evidence);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
