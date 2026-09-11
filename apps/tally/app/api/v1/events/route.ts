import {ingest} from '../../../../lib/ingestion';
import {boundedJson,fail} from '../../../../lib/http';
import {db} from '../../../../lib/db';
export const runtime='nodejs';
export async function POST(req:Request){const origin=req.headers.get('origin');let response:Response;try{response=Response.json(await ingest(await boundedJson(req),origin),{status:202});}catch(e){response=fail(e);}if(origin){response.headers.set('Access-Control-Allow-Origin',origin);response.headers.set('Vary','Origin');}response.headers.set('Cache-Control','no-store');return response;}
export async function OPTIONS(req:Request){const origin=req.headers.get('origin');if(!origin||!await db.project.findFirst({where:{origins:{has:origin}},select:{id:true}}))return new Response(null,{status:403});return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'}});}
