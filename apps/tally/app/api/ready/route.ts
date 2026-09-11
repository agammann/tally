import {db} from '../../../lib/db';
export const dynamic='force-dynamic';
export async function GET(){try{await db.installation.count();return Response.json({status:'ready'});}catch{return Response.json({status:'unavailable'},{status:503});}}
