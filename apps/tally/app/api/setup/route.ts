import {randomUUID,timingSafeEqual} from 'node:crypto';
import {hashPassword} from 'better-auth/crypto';
import {z} from 'zod';
import {db} from '../../../lib/db';
import {sameOrigin,HttpError} from '../../../lib/auth';
import {boundedJson,fail,json} from '../../../lib/http';
export const dynamic='force-dynamic';
export async function GET(){return json({setupRequired:!await db.installation.findUnique({where:{id:1}})});}
export async function POST(req:Request){try{sameOrigin(req);const parsed=z.object({token:z.string().min(32).max(128),email:z.email().max(254),password:z.string().min(12).max(128),name:z.string().trim().min(1).max(80)}).strict().safeParse(await boundedJson(req,2048));if(!parsed.success)throw new HttpError(400,'Valid owner details and 12–128 character password required');const b=parsed.data,expected=process.env.SETUP_TOKEN;if(!expected||Buffer.byteLength(b.token)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(b.token),Buffer.from(expected)))throw new HttpError(403,'Setup token not accepted');const password=await hashPassword(b.password);await db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(77331901)`;if(await tx.installation.findUnique({where:{id:1}}))throw new HttpError(409,'Owner already configured');const id=randomUUID();await tx.user.create({data:{id,name:b.name,email:b.email.toLowerCase(),emailVerified:true}});await tx.account.create({data:{id:randomUUID(),accountId:id,userId:id,providerId:'credential',password}});await tx.installation.create({data:{id:1,ownerId:id}});});return json({created:true},201);}catch(e){return fail(e);}}
