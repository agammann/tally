import {report} from '../../../lib/reports';
import {fail,json} from '../../../lib/http';
export async function GET(req:Request){try{const q=Object.fromEntries(new URL(req.url).searchParams);const isExport=q.export==='json';delete q.export;const r=await report(req.headers,q);const response=json(r);if(isExport)response.headers.set('Content-Disposition','attachment; filename="tally-report.json"');return response;}catch(e){return fail(e);}}
