import {afterEach, describe, expect, it, vi} from 'vitest';
import {registerTools, type BrowserTool} from '../packages/shared/src/webmcp';

afterEach(() => vi.unstubAllGlobals());
const tools:BrowserTool[] = ['first', 'second'].map(name => ({name, description:name, execute:() => name}));

function browserContext(failSecond=false, legacy=false) {
 const active=new Set<string>();
 const unregisterTool=vi.fn((name:string) => active.delete(name));
 const registerTool=vi.fn(async(tool:BrowserTool, options?:{signal:AbortSignal}) => {
  if(failSecond && tool.name==='second') throw Error('Registration rejected');
  active.add(tool.name);
  options?.signal.addEventListener('abort', () => active.delete(tool.name), {once:true});
 });
 vi.stubGlobal('document', {modelContext:{registerTool,...(legacy?{unregisterTool}:{})}});
 return {active,registerTool,unregisterTool};
}

describe('native registration lifecycle', () => {
 it('removes every earlier registration when a later registration fails without the legacy API', async() => {
  const {active}=browserContext(true);
  expect(await registerTools(tools,new AbortController().signal)).toContain('registration failed');
  expect([...active]).toEqual([]);
 });
 it('links successful registrations to the caller lifetime', async() => {
  const {active}=browserContext();const lifetime=new AbortController();
  expect(await registerTools(tools,lifetime.signal)).toContain('registered');
  expect([...active]).toEqual(['first','second']);lifetime.abort();
  expect([...active]).toEqual([]);
 });
 it('retains cleanup for older implementations', async() => {
  const {unregisterTool}=browserContext(true,true);
  await registerTools(tools,new AbortController().signal);
  expect(unregisterTool).toHaveBeenCalledExactlyOnceWith('first');
 });
 it('does not register tools for an already ended lifetime', async() => {
  const {registerTool}=browserContext();const lifetime=new AbortController();lifetime.abort();
  expect(await registerTools(tools,lifetime.signal)).toContain('stopped');
  expect(registerTool).not.toHaveBeenCalled();
 });
});
