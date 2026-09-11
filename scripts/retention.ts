import './env';import {PrismaClient} from '@prisma/client';import {pathToFileURL} from 'node:url';
export async function cleanup(db:PrismaClient,now=new Date()){
 let removed=0;for(const p of await db.project.findMany()){const cutoff=new Date(now.getTime()-p.retentionDays*86400000);removed+=await db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${p.id},0))`;
  const workflows=await tx.$executeRaw`DELETE FROM "Event" WHERE "projectId"=${p.id} AND "workflowId" IN (SELECT "workflowId" FROM "Event" WHERE "projectId"=${p.id} AND "workflowId" IS NOT NULL GROUP BY "workflowId" HAVING COALESCE(MIN("clientAt") FILTER (WHERE kind='workflow_started'),MIN("clientAt")) < ${cutoff})`;
  const invocations=await tx.$executeRaw`DELETE FROM "Event" WHERE "projectId"=${p.id} AND "invocationId" IN (SELECT "invocationId" FROM "Event" WHERE "projectId"=${p.id} AND "invocationId" IS NOT NULL GROUP BY "invocationId" HAVING COALESCE(MIN("clientAt") FILTER (WHERE kind='tool_started'),MIN("clientAt")) < ${cutoff})`;
  return workflows+invocations;
 });}await db.counter.deleteMany({where:{expiresAt:{lt:now}}});await db.rateLimit.deleteMany({where:{lastRequest:{lt:BigInt(now.getTime()-86400000)}}});await db.session.deleteMany({where:{expiresAt:{lt:now}}});await db.verification.deleteMany({where:{expiresAt:{lt:now}}});return removed;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const db=new PrismaClient({log:[]});cleanup(db).then(n=>console.log(`Retention complete: ${n} event rows removed.`)).catch(()=>{console.error('Retention failed');process.exitCode=1;}).finally(()=>db.$disconnect());}
