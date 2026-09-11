export type Outcome='success'|'failure'|'cancellation'|'unknown';
export type Source='webmcp'|'manual'|'application'|'unknown';
export type Classification={outcome:Outcome;errorCode?:string};
export type WorkflowMetadata={workflowId:string;workflowName:string;source:Source};
export type Config={endpoint:string;ingestionId:string;environment:string;release?:string;enabled?:boolean;allowedMetadata:{tools:readonly string[];errorCodes:readonly string[];workflowNames:readonly string[];routeLabels?:readonly string[]};maxBuffer?:number;batchSize?:number;timeoutMs?:number;maxRetries?:number;flushIntervalMs?:number;fetch?:typeof fetch};
export type WrapOptions={source:Source;toolVersion?:string;routeLabel?:string;workflow?:()=>{workflowId:string;workflowName:string}|undefined;classifyResult?:(result:unknown)=>Classification};
type Event={schemaVersion:1;eventId:string;kind:string;environment:string;source:Source;clientAt:string;release?:string;invocationId?:string;tool?:string;toolVersion?:string;durationMs?:number;outcome?:Outcome;errorCode?:string;workflowId?:string;workflowName?:string;routeLabel?:string};
type Definition={name:string;execute:(...args:any[])=>any};
const label=(s:unknown):s is string=>typeof s==='string'&&/^[a-zA-Z0-9_.:-]{1,64}$/.test(s);
const uuid=(s:unknown):s is string=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const clamp=(n:number|undefined,fallback:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(n)?Math.floor(n!):fallback));
const outcomes:Outcome[]=['success','failure','cancellation','unknown'];
const sources:Source[]=['webmcp','manual','application','unknown'];
export function createTallyClient(config:Config){
 let enabled=config.enabled!==false,queue:Event[]=[],active:Promise<void>|undefined,timer:ReturnType<typeof setTimeout>|undefined,generation=0;
 const controllers=new Set<AbortController>();
 const cap=clamp(config.maxBuffer,200,1,1000),batchSize=clamp(config.batchSize,25,1,50),timeout=clamp(config.timeoutMs,2000,10,5000),retries=clamp(config.maxRetries,2,0,3),interval=clamp(config.flushIntervalMs,5000,100,30000);
 const diagnostics={dropped:0,rejected:0,retries:0,transportFailures:0,classifierErrors:0};
 const inc=(key:keyof typeof diagnostics,n=1)=>{diagnostics[key]=Math.min(2147483647,diagnostics[key]+n);};
 let valid=false;try{const u=new URL(config.endpoint);valid=(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))&&!u.username&&!u.password&&uuid(config.ingestionId)&&label(config.environment)&&(!config.release||label(config.release));}catch{/* fail closed for collection */}
 if(!valid)enabled=false;
 const transport=config.fetch??globalThis.fetch?.bind(globalThis);
 const now=()=>{try{return performance.now();}catch{return Date.now();}};
 function schedule(){if(!timer&&enabled&&queue.length){timer=setTimeout(()=>{timer=undefined;void flush();},interval);(timer as unknown as {unref?:()=>void}).unref?.();}}
 function emit(fields:Omit<Event,'schemaVersion'|'eventId'|'environment'|'release'|'clientAt'>){if(!enabled)return;try{const e:Event={schemaVersion:1,eventId:crypto.randomUUID(),environment:config.environment,...(config.release?{release:config.release}:{}),clientAt:new Date().toISOString(),...fields};if(queue.length>=cap){queue.shift();inc('dropped');}queue.push(e);schedule();}catch{inc('dropped');}}
 async function request(batch:Event[],epoch:number){
  if(!transport){inc('transportFailures');inc('dropped',batch.length);return;}
  for(let attempt=0;attempt<=retries&&enabled&&epoch===generation;attempt++){
   const ac=new AbortController();controllers.add(ac);let timeoutId:ReturnType<typeof setTimeout>|undefined;
   try{
    const response=await Promise.race([Promise.resolve().then(()=>transport(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ingestionId:config.ingestionId,events:batch}),credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,signal:ac.signal})),new Promise<never>((_,reject)=>{timeoutId=setTimeout(()=>{ac.abort();reject(new Error('timeout'));},timeout);})]);
    if(response.ok)return;
    if(response.status!==408&&response.status!==429&&response.status<500){inc('rejected',batch.length);return;}
   }catch{inc('transportFailures');}finally{if(timeoutId)clearTimeout(timeoutId);controllers.delete(ac);}
   if(attempt<retries&&enabled&&epoch===generation){inc('retries');await new Promise(resolve=>setTimeout(resolve,Math.min(1000,100*2**attempt)));}
  }
  inc('dropped',batch.length);
 }
 function flush():Promise<void>{if(!enabled)return Promise.resolve();if(active)return active;const snapshot=queue.splice(0,cap),epoch=generation;if(timer){clearTimeout(timer);timer=undefined;}active=(async()=>{for(let i=0;i<snapshot.length&&enabled&&epoch===generation;i+=batchSize)await request(snapshot.slice(i,i+batchSize),epoch);})().catch(()=>{inc('transportFailures');}).finally(()=>{active=undefined;schedule();});return active;}
 function workflow(kind:string,m:WorkflowMetadata){try{if(!uuid(m.workflowId)||!config.allowedMetadata.workflowNames.includes(m.workflowName)||!sources.includes(m.source)){inc('rejected');return;}emit({kind,workflowId:m.workflowId,workflowName:m.workflowName,source:m.source});}catch{inc('rejected');}}
 function wrapTool<T extends Definition>(definition:T,options:WrapOptions):T {
  const original=definition.execute;
  const wrapped=function(this:unknown,...args:Parameters<T['execute']>){
   let id:string|undefined,started=0,fields:Record<string,unknown>={};
   try{if(enabled&&config.allowedMetadata.tools.includes(definition.name)&&label(definition.name)){
    id=crypto.randomUUID();started=now();fields={tool:definition.name,invocationId:id,source:sources.includes(options.source)?options.source:'unknown'};
    if(label(options.toolVersion))fields.toolVersion=options.toolVersion;
    if(options.routeLabel&&config.allowedMetadata.routeLabels?.includes(options.routeLabel))fields.routeLabel=options.routeLabel;
    const w=options.workflow?.();if(w&&uuid(w.workflowId)&&config.allowedMetadata.workflowNames.includes(w.workflowName)){fields.workflowId=w.workflowId;fields.workflowName=w.workflowName;}
    emit({...fields,kind:'tool_started'} as Parameters<typeof emit>[0]);
   }}catch{inc('rejected');}
   const finish=(result:unknown,error:boolean)=>{if(!id)return;try{
    let c:Classification;
    if(error){const abort=typeof result==='object'&&result!==null&&'name' in result&&result.name==='AbortError';c={outcome:abort?'cancellation':'failure'};const code=typeof result==='object'&&result!==null&&'code' in result?result.code:undefined;if(typeof code==='string')c.errorCode=code;}
    else if(options.classifyResult){try{c=options.classifyResult(result);if(!c||!outcomes.includes(c.outcome))throw new Error();}catch{inc('classifierErrors');c={outcome:'unknown'};}}
    else c={outcome:typeof result==='object'&&result!==null&&'isError' in result&&result.isError===true?'failure':'success'};
    const errorCode=c.errorCode&&config.allowedMetadata.errorCodes.includes(c.errorCode)&&label(c.errorCode)?c.errorCode:undefined;
    emit({...fields,kind:'tool_finished',outcome:c.outcome,durationMs:Math.min(86400000,Math.max(0,now()-started)),...(errorCode?{errorCode}:{})} as Parameters<typeof emit>[0]);
   }catch{inc('rejected');}};
   let result:unknown;
   try{result=original.apply(this,args);}catch(error){finish(error,true);throw error;}
   // Preserve synchronous callback values; async callbacks retain their resolution/rejection values.
   if(result instanceof Promise)return result.then((value:unknown)=>{finish(value,false);return value;},(error:unknown)=>{finish(error,true);throw error;});
   finish(result,false);return result;
  };
  const descriptors=Object.getOwnPropertyDescriptors(definition);descriptors.execute={...descriptors.execute,value:wrapped};return Object.create(Object.getPrototypeOf(definition),descriptors) as T;
 }
 const lifecycle=()=>{void flush();};const visibility=()=>{if(document.visibilityState==='hidden')lifecycle();};
 if(typeof window!=='undefined'){window.addEventListener('pagehide',lifecycle);document.addEventListener('visibilitychange',visibility);}
 function disable(){enabled=false;generation++;inc('dropped',queue.length);queue=[];if(timer)clearTimeout(timer);timer=undefined;for(const ac of controllers)ac.abort();if(typeof window!=='undefined'){window.removeEventListener('pagehide',lifecycle);document.removeEventListener('visibilitychange',visibility);}}
 return {wrapTool,trackWorkflowStarted:(m:WorkflowMetadata)=>workflow('workflow_started',m),trackWorkflowCompleted:(m:WorkflowMetadata)=>workflow('workflow_completed',m),flush,disable,getDiagnostics:()=>({...diagnostics,queued:queue.length,enabled})};
}
export type TallyClient=ReturnType<typeof createTallyClient>;
