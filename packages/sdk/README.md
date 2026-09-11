# @tally-local/sdk 0.1.0

Dependency-free TypeScript instrumentation for explicitly wrapped WebMCP callbacks. Sends Tally schema v1 metadata to a private collector. ESM, CommonJS and declaration files are included. The scope is provisional and no license grant is selected.

```ts
import { createTallyClient } from '@tally-local/sdk';
const tally = createTallyClient({
  endpoint: 'http://localhost:3000/api/v1/events',
  ingestionId: 'YOUR_PROJECT_UUID', environment: 'development',
  allowedMetadata: {tools: ['search_products'], errorCodes: [], workflowNames: ['checkout']},
});
const wrapped = tally.wrapTool(yourToolDefinition, {source: 'webmcp'});
// Register wrapped with the supported browser API; keep unsupported-browser UI working.
```

`createTallyClient`, `wrapTool`, `trackWorkflowStarted`, `trackWorkflowCompleted`, `flush`, `disable`, and `getDiagnostics` are Tally APIs, not WebMCP standard methods. Preserve an original tool definition to create separate `manual` or `application` wrappers. Never wrap a wrapper.

Best-effort telemetry, bounded queue/retries/request deadlines, no global patching, no argument/result/error-message collection. Default queue 200, batch 25, timeout 2 seconds, retries 2, interval 5 seconds. Overflow drops oldest. Disabling discards queued data; sent data is not retracted. Cancellation is observed only on a rejected/thrown AbortError. Application-reported source and outcomes are not independent verification.

Full integration, result-classification, privacy, compatibility and operations documentation ships with the Tally repository at https://github.com/agammann/tally/tree/main/docs.
