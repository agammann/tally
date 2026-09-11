import { z } from 'zod';
export const label = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_.:-]+$/);
export const sourceSchema = z.enum(['webmcp','manual','application','unknown']);
export const outcomeSchema = z.enum(['success','failure','cancellation','unknown']);
export const eventSchema = z.object({
  schemaVersion:z.literal(1), eventId:z.uuid(), kind:z.enum(['tool_started','tool_finished','workflow_started','workflow_completed']),
  invocationId:z.uuid().optional(), tool:label.optional(), toolVersion:label.optional(), release:label.optional(), environment:label,
  source:sourceSchema, clientAt:z.iso.datetime(), durationMs:z.number().finite().min(0).max(86400000).optional(), outcome:outcomeSchema.optional(),
  errorCode:label.optional(), workflowId:z.uuid().optional(), workflowName:label.optional(), routeLabel:label.optional(),
}).strict().superRefine((e,c)=>{
  const tool=e.kind.startsWith('tool_');
  if(tool && (!e.invocationId || !e.tool)) c.addIssue({code:'custom',message:'Tool identity required'});
  if(!tool && (!e.workflowId || !e.workflowName)) c.addIssue({code:'custom',message:'Workflow identity required'});
  if(!tool && (e.invocationId || e.tool || e.toolVersion || e.durationMs!==undefined || e.outcome || e.errorCode)) c.addIssue({code:'custom',message:'Unexpected tool fields'});
  if(e.kind==='tool_finished' && (!e.outcome || e.durationMs===undefined)) c.addIssue({code:'custom',message:'Terminal fields required'});
  if(e.kind==='tool_started' && (e.outcome || e.durationMs!==undefined || e.errorCode)) c.addIssue({code:'custom',message:'Unexpected terminal fields'});
  if(e.workflowId && !e.workflowName) c.addIssue({code:'custom',message:'Workflow name required'});
  if(e.workflowName && !e.workflowId) c.addIssue({code:'custom',message:'Workflow ID required'});
});
export type TelemetryEvent=z.infer<typeof eventSchema>;
export const batchSchema=z.object({ingestionId:z.uuid(),events:z.array(eventSchema).min(1).max(50)}).strict();
const vocab = z.array(label).max(100).refine(a=>new Set(a).size===a.length,'Duplicate labels');
export const projectSchema=z.object({name:z.string().trim().min(1).max(80),origins:z.array(z.string().url().max(200).refine(s=>{try {const u=new URL(s);return u.origin===s && (u.protocol==='https:' || (u.protocol==='http:' && ['localhost','127.0.0.1'].includes(u.hostname)));}catch{return false;}})).min(1).max(20),tools:vocab.min(1),environments:vocab.min(1),releases:vocab,errorCodes:vocab,routeLabels:vocab,workflowName:label,retentionDays:z.number().int().min(1).max(365),dailyQuota:z.number().int().min(100).max(1000000)}).strict();
export const reportFilterSchema=z.object({projectId:z.uuid(),from:z.iso.datetime(),to:z.iso.datetime(),environment:label.optional(),source:sourceSchema.optional(),tool:label.optional(),release:label.optional()}).strict().refine(f=>{const n=Date.parse(f.to)-Date.parse(f.from);return n>0 && n<=31*86400000;},'Use a positive range of at most 31 days');
export type ReportFilter=z.infer<typeof reportFilterSchema>;
export * from './metrics';
export * from './webmcp';
