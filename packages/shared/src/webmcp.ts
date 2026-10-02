// Browser-specific registration is deliberately confined to this adapter.
export type BrowserTool={name:string;description:string;inputSchema?:Record<string,unknown>;execute:(...args:any[])=>any;annotations?:Record<string,boolean>};
type Context={registerTool:(t:BrowserTool,o?:{signal:AbortSignal})=>Promise<void>|void;unregisterTool?:(name:string)=>void};
export function nativeContext():Context|undefined {return typeof document==='undefined'?undefined:(document as Document & {modelContext?:Context}).modelContext;}
export async function registerTools(tools:BrowserTool[],signal:AbortSignal):Promise<string>{
 const ctx=nativeContext();if(!ctx?.registerTool)return 'Native WebMCP unavailable. Ordinary controls and labeled manual tests remain available.';
 const registered:string[]=[];
 const registration=new AbortController();
 const cleanup=()=>{registration.abort();signal.removeEventListener('abort',cleanup);for(const name of registered){try{ctx.unregisterTool?.(name);}catch{ /* old implementation cleanup is best effort */ }}};
 signal.addEventListener('abort',cleanup,{once:true});
 try{for(const tool of tools){if(signal.aborted)break;await ctx.registerTool(tool,{signal:registration.signal});registered.push(tool.name);}if(signal.aborted){cleanup();return 'Native registration stopped.';}return 'Native WebMCP registered. Execution source and outcomes are application-reported.';}
 catch {cleanup();return signal.aborted?'Native registration stopped.':'Native WebMCP registration failed. Use ordinary controls or labeled manual tests.';}
}
