import {auth,sameOrigin,HttpError} from '../../../../lib/auth';
import {db} from '../../../../lib/db';
import {boundedJson,fail} from '../../../../lib/http';
// Expose only the login/session/logout surface; recovery and bootstrap require server access.
async function handle(req:Request){try{const path=new URL(req.url).pathname;if(!['/api/auth/sign-in/email','/api/auth/sign-out','/api/auth/get-session'].includes(path))throw new HttpError(404,'Not found');if(req.method==='POST'){
 sameOrigin(req);const body=await boundedJson(req,4096);
 // Global installation budget is intentional for one owner. No spoofable IP headers or visitor identifiers.
 if(new URL(req.url).pathname.endsWith('/sign-in/email')){const key='owner-login:'+Math.floor(Date.now()/60000);const r=await db.rateLimit.upsert({where:{key},create:{key,count:1,lastRequest:BigInt(Date.now())},update:{count:{increment:1}}});if(r.count>5)throw new HttpError(429,'Too many login attempts; wait one minute');}
 req=new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify(body)});
 }return auth.handler(req);}catch(e){return fail(e);}}
export const GET=handle;export const POST=handle;
