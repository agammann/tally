import {Prisma} from '@prisma/client';
import {batchSchema, type TelemetryEvent} from '@tally-local/shared';
import {db} from './db';
import {HttpError} from './auth';
export async function ingest(body:unknown,origin:string|null,now=new Date()){
 const parsed=batchSchema.safeParse(body);if(!parsed.success)throw new HttpError(400,'Invalid schema v1 batch');
 const {ingestionId,events}=parsed.data;
 return db.$transaction(async tx=>{
  const p=await tx.project.findUnique({where:{ingestionId}});if(!p)throw new HttpError(403,'Ingestion identifier not accepted');
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${p.id},0))`;
  const current=await tx.project.findUnique({where:{id:p.id}});if(!current||current.ingestionId!==ingestionId)throw new HttpError(403,'Ingestion identifier not accepted');
  if(!origin||!current.origins.includes(origin))throw new HttpError(403,'Origin not allowed');
  for(const e of events){
   if(!current.environments.includes(e.environment)||(e.tool&&!current.tools.includes(e.tool))||(e.release&&!current.releases.includes(e.release))||(e.errorCode&&!current.errorCodes.includes(e.errorCode))||(e.routeLabel&&!current.routeLabels.includes(e.routeLabel))||(e.workflowName&&e.workflowName!==current.workflowName))throw new HttpError(400,'Metadata is not allowlisted');
   const age=now.getTime()-Date.parse(e.clientAt);if(age>Math.min(7,current.retentionDays)*86400000||age< -300000)throw new HttpError(400,'Timestamp outside acceptance window');
  }
  const minute=Math.floor(now.getTime()/60000); const rate=await tx.counter.upsert({where:{projectId_key:{projectId:p.id,key:'minute:'+minute}},create:{projectId:p.id,key:'minute:'+minute,count:1,expiresAt:new Date(now.getTime()+120000)},update:{count:{increment:1}}});
  if(rate.count>120)throw new HttpError(429,'Project request limit reached');
  const ids=[...new Set(events.map(e=>e.eventId))];const existing=await tx.event.findMany({where:{projectId:p.id,eventId:{in:ids}},select:{eventId:true}});const found=new Set(existing.map(e=>e.eventId));
  const unique=events.filter(e=>{if(found.has(e.eventId))return false;found.add(e.eventId);return true;});
  const key='day:'+now.toISOString().slice(0,10); const quota=await tx.counter.upsert({where:{projectId_key:{projectId:p.id,key}},create:{projectId:p.id,key,count:unique.length,expiresAt:new Date(now.getTime()+2*86400000)},update:{count:{increment:unique.length}}});
  if(quota.count>current.dailyQuota)throw new HttpError(429,'Project daily quota reached');
  await tx.event.createMany({data:unique.map((e:TelemetryEvent)=>({...e,projectId:p.id,clientAt:new Date(e.clientAt),receivedAt:now,...(e.workflowId?{workflowVersion:current.workflowVersion,workflowWindowMs:current.workflowWindowMs}:{})})),skipDuplicates:true});
  return {accepted:unique.length,duplicates:events.length-unique.length,schemaVersion:1};
 },{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted,timeout:10000,maxWait:5000});
}
