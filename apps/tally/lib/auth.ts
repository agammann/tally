import {betterAuth} from 'better-auth';
import {prismaAdapter} from 'better-auth/adapters/prisma';
import {db} from './db';
export const auth=betterAuth({database:prismaAdapter(db,{provider:'postgresql'}),baseURL:process.env.BETTER_AUTH_URL,secret:process.env.BETTER_AUTH_SECRET,emailAndPassword:{enabled:true,disableSignUp:true,minPasswordLength:12,maxPasswordLength:128},session:{expiresIn:60*60*8,updateAge:0,cookieCache:{enabled:false}},rateLimit:{enabled:true,storage:'database',window:60,max:30,customRules:{'/sign-in/email':{window:60,max:5}}},advanced:{useSecureCookies:process.env.BETTER_AUTH_URL?.startsWith('https:')??false,ipAddress:{disableIpTracking:true}},logger:{disabled:true}});
export async function owner(headers:Headers){const session=await auth.api.getSession({headers});if(!session)throw new HttpError(401,'Sign in required');const installation=await db.installation.findUnique({where:{id:1}});if(installation?.ownerId!==session.user.id)throw new HttpError(403,'Owner access required');return session.user.id;}
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export function sameOrigin(req:Request){if(req.headers.get('origin')!==new URL(process.env.BETTER_AUTH_URL!).origin)throw new HttpError(403,'Origin not allowed');}
export async function authorizeProject(headers:Headers,id:string){const ownerId=await owner(headers);const p=await db.project.findFirst({where:{id,ownerId}});if(!p)throw new HttpError(404,'Project not found');return p;}
