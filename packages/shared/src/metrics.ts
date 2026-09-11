import type { TelemetryEvent, ReportFilter } from './index';
export type StoredEvent=TelemetryEvent & {receivedAt:string;workflowVersion?:number;workflowWindowMs?:number};
export type Invocation={id:string;tool:string;release?:string;environment:string;source:string;workflowId?:string;start:string|null;last:string;outcome:string;durationMs:number|null;errorCode:string|null;missingStart:boolean};
export const definitions={calls:'Distinct invocations with an observed start; cohort by earliest observed client start in [from,to).',successRate:'success / (success + failure); cancellation, incomplete and unknown/conflicted excluded.',latency:'Unambiguous success and failure with a start. Nearest-rank p95; median averages middle pair. Duration is application-reported monotonic milliseconds.',workflow:'Observed workflow completion: matured starts completed within the snapshotted 30 minute window. Not payment or causal attribution.',source:'Application-reported; not independent caller verification.',time:'UTC, inclusive from / exclusive to. Starts accepted up to 7 days late and 5 minutes ahead. Reports may change with late arrivals.'};
export function reconcile(events:StoredEvent[]):Invocation[]{
 const groups=new Map<string,StoredEvent[]>();
 for(const e of events)if(e.invocationId){const g=groups.get(e.invocationId)||[];g.push(e);groups.set(e.invocationId,g);}
 return [...groups].map(([id,g])=>{
  const starts=g.filter(e=>e.kind==='tool_started').sort((a,b)=>a.clientAt.localeCompare(b.clientAt));
  const terms=g.filter(e=>e.kind==='tool_finished'); const first=starts[0]||g[0]!;
  const metadata=(e:StoredEvent)=>JSON.stringify([e.tool,e.toolVersion,e.release,e.environment,e.source,e.workflowId,e.workflowName]);
  const signatures=new Set(terms.map(e=>JSON.stringify([e.outcome,e.durationMs,e.errorCode])));
  const conflict=signatures.size>1 || g.some(e=>metadata(e)!==metadata(first));
  const t=terms[0];
  return {id,tool:first.tool!,release:first.release,environment:first.environment,source:first.source,workflowId:first.workflowId,start:starts[0]?.clientAt??null,last:g.map(e=>e.receivedAt).sort().at(-1)!,outcome:conflict?'conflicted':t?.outcome??'incomplete',durationMs:conflict?null:t?.durationMs??null,errorCode:conflict?null:t?.errorCode??null,missingStart:!starts.length};
 });
}
export function summarize(rows:Invocation[]){
 const count=(o:string)=>rows.filter(r=>r.outcome===o).length;
 const success=count('success'),failure=count('failure'),cancellation=count('cancellation'),incomplete=count('incomplete'),unknown=count('unknown')+count('conflicted');
 const ds=rows.filter(r=>['success','failure'].includes(r.outcome)&&r.durationMs!==null).map(r=>r.durationMs!).sort((a,b)=>a-b);
 const n=ds.length; const median=n?(n%2?ds[Math.floor(n/2)]!:(ds[n/2-1]!+ds[n/2]!)/2):null;
 return {callsStarted:rows.filter(r=>!r.missingStart).length,success,failure,cancellation,incomplete,unknown,conflicted:count('conflicted'),successRate:success+failure?success/(success+failure):null,medianMs:median,p95Ms:n?ds[Math.ceil(n*.95)-1]!:null,latencySamples:n};
}
export function analytics(events:StoredEvent[],f:ReportFilter,now=new Date()){
 const inPeriod=(t:string)=>Date.parse(t)>=Date.parse(f.from)&&Date.parse(t)<Date.parse(f.to);
 const match=(r:Invocation)=> (!f.environment||r.environment===f.environment)&&(!f.source||r.source===f.source)&&(!f.tool||r.tool===f.tool)&&(!f.release||r.release===f.release);
 const all=reconcile(events); const rows=all.filter(r=>r.start&&inPeriod(r.start)&&match(r));
 const missingStarts=all.filter(r=>!r.start&&inPeriod(r.last)&&match(r));
 const tools=[...new Set(rows.map(r=>r.tool))].sort().map(tool=>({tool,...summarize(rows.filter(r=>r.tool===tool))}));
 const failures=Object.entries(rows.filter(r=>r.outcome==='failure').reduce<Record<string,number>>((a,r)=>{const key=r.tool+' / '+(r.errorCode??'UNCLASSIFIED');a[key]=(a[key]??0)+1;return a;},{})).map(([group,count])=>({group,count})).sort((a,b)=>b.count-a.count).slice(0,100);
 const trend: {date:string;calls:number;failures:number}[]=[];
 for(let d=Date.parse(f.from);d<Date.parse(f.to);d+=86400000){const end=Math.min(d+86400000,Date.parse(f.to));const day=rows.filter(r=>Date.parse(r.start!)>=d&&Date.parse(r.start!)<end);trend.push({date:new Date(d).toISOString(),calls:day.length,failures:day.filter(r=>r.outcome==='failure').length});}
 const releases=[...new Set(rows.map(r=>r.release??'(unspecified)'))].sort().map(release=>{const rr=rows.filter(r=>(r.release??'(unspecified)')===release);return {release,first:rr.map(r=>r.start!).sort()[0],last:rr.map(r=>r.start!).sort().at(-1),...summarize(rr)};});
 const executionsByWorkflow=new Map<string,Invocation[]>();
 for(const invocation of all){if(!invocation.workflowId)continue;const group=executionsByWorkflow.get(invocation.workflowId)??[];group.push(invocation);executionsByWorkflow.set(invocation.workflowId,group);}
 const wg=new Map<string,StoredEvent[]>();for(const e of events)if(e.workflowId&&e.kind.startsWith('workflow_')){const g=wg.get(e.workflowId)||[];g.push(e);wg.set(e.workflowId,g);}
 let matured=0,completed=0,open=0,missingWorkflowStarts=0,workflowConflicted=0; const timeline: {id:string;name:string;version:number;windowMs:number;start:string;status:string;executions:Invocation[]}[]=[];
 for(const [id,g] of wg){
  const s=g.filter(e=>e.kind==='workflow_started').sort((a,b)=>a.clientAt.localeCompare(b.clientAt))[0];
  const fits=(e:StoredEvent)=>(!f.environment||e.environment===f.environment)&&(!f.source||e.source===f.source)&&(!f.release||e.release===f.release);
  if(!s){if(g.some(e=>fits(e)&&inPeriod(e.clientAt)))missingWorkflowStarts++;continue;}
  if(!fits(s)||!inPeriod(s.clientAt))continue;
  const window=s.workflowWindowMs??1800000, deadline=Date.parse(s.clientAt)+window;
  const conflict=g.some(e=>e.environment!==s.environment||e.source!==s.source||e.workflowName!==s.workflowName||e.release!==s.release);
  const isMature=now.getTime()>=deadline;
  const done=g.some(e=>e.kind==='workflow_completed'&&Date.parse(e.clientAt)>=Date.parse(s.clientAt)&&Date.parse(e.clientAt)<=deadline);
  if(conflict)workflowConflicted++;else if(isMature){matured++;if(done)completed++;}else open++;
  timeline.push({id,name:s.workflowName!,version:s.workflowVersion??1,windowMs:window,start:s.clientAt,status:conflict?'conflicted':!isMature?'open':done?'completed':'missing completion',executions:[]});
 }
 const boundedTimeline=timeline.sort((a,b)=>b.start.localeCompare(a.start)).slice(0,100).map(w=>({...w,executions:(executionsByWorkflow.get(w.id)??[]).sort((a,b)=>(a.start??a.last).localeCompare(b.start??b.last)).slice(0,100)}));
 return {definitions,period:{from:f.from,to:f.to,timezone:'UTC'},filters:f,generatedAt:now.toISOString(),freshness:events.map(e=>e.receivedAt).sort().at(-1)??null,sampleSize:rows.length,summary:summarize(rows),tools,failures,trend,releases,recent:rows.sort((a,b)=>b.start!.localeCompare(a.start!)).slice(0,100),missingStarts:{count:missingStarts.length,records:missingStarts.slice(0,100)},workflow:{label:'Observed workflow completion',matured,completed,rate:matured?completed/matured:null,open,missingCompletion:matured-completed,missingStarts:missingWorkflowStarts,conflicted:workflowConflicted,timeline:boundedTimeline,filterNote:'Workflow cohorts use environment, source, release and start period. Tool filter only affects tool reports.'}};
}
export type AnalyticsReport=ReturnType<typeof analytics>;
