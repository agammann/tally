import {analytics,reportFilterSchema,type StoredEvent,type ReportFilter} from '@tally-local/shared';
import {db} from './db';
import {authorizeProject,HttpError} from './auth';
export async function report(headers:Headers,input:unknown){const f=reportFilterSchema.safeParse(input);if(!f.success)throw new HttpError(400,'Invalid filters; use a UTC range of at most 31 days');await authorizeProject(headers,f.data.projectId);return reportData(f.data);}
export async function reportData(f:ReportFilter){
 // Fetch every retained event for the project before reconciliation. Never filter terminals out of a start cohort.
 const events=await db.event.findMany({where:{projectId:f.projectId},take:50001,orderBy:{id:'asc'}});
 if(events.length>50000)throw new HttpError(422,'Project exceeds the 50,000-event reporting limit. Reduce retention or export a database backup for offline analysis.');
 return analytics(events.map(e=>{const o:Record<string,unknown>={};for(const [k,v] of Object.entries(e))if(v!==null&&!['id','projectId'].includes(k))o[k]=v instanceof Date?v.toISOString():v;return o as StoredEvent;}),f);
}
