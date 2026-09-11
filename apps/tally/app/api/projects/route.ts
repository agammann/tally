import {projectSchema} from '@tally-local/shared';
import {db} from '../../../lib/db';
import {owner,sameOrigin,HttpError} from '../../../lib/auth';
import {boundedJson,fail,json} from '../../../lib/http';
export async function GET(req:Request){try{return json(await db.project.findMany({where:{ownerId:await owner(req.headers)},orderBy:{createdAt:'asc'}}));}catch(e){return fail(e);}}
export async function POST(req:Request){try{sameOrigin(req);const ownerId=await owner(req.headers);const data=projectSchema.safeParse(await boundedJson(req,16384));if(!data.success)throw new HttpError(400,'Invalid project settings');const p=await db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(77331902)`;if(await tx.project.count({where:{ownerId}})>=20)throw new HttpError(409,'Installation limit: 20 projects');return tx.project.create({data:{...data.data,ownerId}});});return json(p,201);}catch(e){return fail(e);}}
