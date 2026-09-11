import {analytics,type StoredEvent} from '../packages/shared/src';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const at='2026-09-08T00:00:00.000Z';
const events:StoredEvent[]=[];
for(let i=0;i<25000;i++){
 const workflowId=crypto.randomUUID();
 const base={schemaVersion:1 as const,environment:'test',source:'manual' as const,clientAt:at,receivedAt:at,workflowId,workflowName:'checkout'};
 events.push({...base,eventId:crypto.randomUUID(),kind:'workflow_started'});
 events.push({...base,eventId:crypto.randomUUID(),kind:'tool_started',tool:'test',invocationId:crypto.randomUUID()});
}
const started=performance.now();
const report=analytics(events,{projectId:crypto.randomUUID(),from:at,to:'2026-09-09T00:00:00.000Z'},new Date('2026-09-09T00:00:00.000Z'));
const elapsedMs=Math.round(performance.now()-started);
assert.equal(report.summary.callsStarted,25000);
assert.equal(report.workflow.matured,25000);
assert.equal(report.workflow.timeline.length,100);
assert.ok(report.workflow.timeline.every(w=>w.executions.length===1&&w.executions[0]!.workflowId===w.id));
const evidence={checkedAt:new Date().toISOString(),events:events.length,workflows:25000,invocations:25000,returnedWorkflows:100,elapsedMs,method:'Single-pass workflow index; detail sorting only after selecting 100 timelines. No hardware-dependent timing assertion.'};
writeFileSync('work/workflow-boundary-results.json',JSON.stringify(evidence,null,2));console.log(evidence);
