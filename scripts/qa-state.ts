import './env';import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';import {randomBytes} from 'node:crypto';
mkdirSync('work',{recursive:true});const file='work/qa-state.json';
export type QaState={email:string;password:string;projectId?:string;ingestionId?:string;referenceId?:string;referenceIngestionId?:string};
export const qa:QaState=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{email:'owner@tally-test.invalid',password:randomBytes(24).toString('hex')};
export function saveQa(){writeFileSync(file,JSON.stringify(qa,null,2),{mode:0o600});}saveQa();
