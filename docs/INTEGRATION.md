# Integrating Tally

The SDK is framework-independent. Build and install its archive as shown in the root README; no registry publication is required. The independent-consumer check installs that archive in a sibling directory outside the workspace dependency graph, compiles its TypeScript declarations, and sends real telemetry to the collector.

```ts
import { createTallyClient } from '@tally-local/sdk';

const tally = createTallyClient({
  endpoint: 'https://tally.example.internal/api/v1/events',
  ingestionId: 'COPY_THE_PUBLIC_UUID_FROM_SETUP',
  environment: 'production',
  release: '2026.09.1',
  enabled: true,
  allowedMetadata: {
    tools: ['check_delivery'],
    errorCodes: ['DELIVERY_UNAVAILABLE'],
    workflowNames: ['checkout'],
    routeLabels: ['store'],
  },
});

let task: {workflowId: string; workflowName: string} | undefined;
function beginTask() {
  task = {workflowId: crypto.randomUUID(), workflowName: 'checkout'};
  tally.trackWorkflowStarted({...task, source: 'webmcp'});
}

const tool = tally.wrapTool({
  name: 'check_delivery',
  description: 'Check delivery for a supported zone.',
  inputSchema: {
    type: 'object', properties: {zone: {type: 'string', enum: ['local','remote']}},
    required: ['zone'], additionalProperties: false,
  },
  async execute(input: {zone: string}, context: {signal?: AbortSignal}) {
    // Use your existing application implementation; do not log input/result here.
    return deliveryService.lookup(input.zone, {signal: context.signal});
  },
}, {
  source: 'webmcp', routeLabel: 'store', workflow: () => task,
  classifyResult(result) {
    // Optional synchronous business classification. Values remain in this app.
    return result && typeof result === 'object' && 'available' in result
      ? {outcome: 'success'} : {outcome: 'unknown'};
  },
});

// Current draft registration. Isolate browser types in your own small adapter.
const context = (document as Document & {
  modelContext?: {registerTool(tool: unknown, options?: {signal: AbortSignal}): Promise<void>}
}).modelContext;
const registration = new AbortController();
if (context?.registerTool) {
  await context.registerTool(tool, {signal: registration.signal});
} else {
  showNativeUnavailable(); // Keep ordinary UI operational.
}

// After the host has durably saved the task's business completion:
if (task) tally.trackWorkflowCompleted({...task, source: 'webmcp'});
await tally.flush(); // Explicitly bounded, best-effort delivery, not a durable receipt.
// On teardown: unregister tool; flush if useful; then disable and discard remaining data.
registration.abort();
tally.disable();
```

The example's application functions (`deliveryService`, `showNativeUnavailable`) belong to the host. Replace them with your own business implementation. Start a task before the first wrapped execution if correlation is desired. Use a new UUID for every task instance; never use an email, account ID, or persistent visitor ID. If ordinary controls should also be measured, create a separate wrapper over the same original action with `source: 'application'`; direct diagnostic buttons must use `manual`. Never wrap a wrapper or patch global registration methods.

## API and behavior

- `createTallyClient(config)` makes a collector. Invalid endpoint/identifier/environment configuration disables collection. Only HTTPS and loopback HTTP endpoints are accepted; credentials in URLs are rejected.
- `wrapTool(definition, options)` returns a copy preserving the prototype and property descriptors, with only `execute` replaced. Pass browser registration options (including registration cancellation) to `registerTool` separately. The original callback executes once with its original `this`, argument objects and execution context. Synchronous values remain synchronous. Promise fulfillment values and rejection objects are preserved; promise identity is not preserved. Version 0.1 supports ordinary synchronous callbacks and native JavaScript promises; custom thenable objects are not treated as promises.
- `trackWorkflowStarted(metadata)` / `trackWorkflowCompleted(metadata)` record explicit host observations. An opaque UUID, allowlisted workflow name, and explicit source are required. Window/definition versions are assigned server-side.
- `flush()` sends a snapshot of the current queue. A concurrent flush shares the active operation; later events remain queued for the next flush. The application action never awaits automatic delivery. Explicit flush resolves despite collection failures, so inspect diagnostics and dashboard receipt when verifying installation.
- `disable()` stops recording, drops queued events, aborts outstanding fetches, and removes lifecycle listeners. Already transmitted or committed events cannot be retracted. Create a fresh client to re-enable.
- `getDiagnostics()` returns bounded numeric counters and queue length; it never contains payloads.

Successful returned values default to `success`. Returned `{isError: true}` uses Tally's documented structured-error convention and becomes `failure`; the WebMCP draft itself does not standardize business success using that property. Supply `classifyResult` for other business conventions. Classifier exceptions or invalid classifications become `unknown` without altering the returned value. A thrown/rejected `AbortError` is an observed cancellation; an aborted signal followed by a successful return is a success. Other exceptions are failures. Only exception `.code` or classifier error codes on the explicit allowlist can leave the application; messages/stacks never do.

## Delivery bounds

Defaults: 200 queued events, batches of 25, 2-second request deadline, 2 retries after the first attempt, and automatic flushing after 5 seconds. Configuration clamps queue capacity to 1–1000, batch size to 1–50, timeout to 10–5000 ms, retries to 0–3, and interval to 100–30000 ms. Backoff is 100, 200, then 400 ms. Each explicit flush handles at most one bounded snapshot; it can take longer than one request, depending on batch count and retries. Do not block a business transaction on flushing.

Overflow drops the oldest queued event and increments `dropped`. Page hiding/pagehide triggers best-effort keepalive delivery, subject to browser payload limits and unload behavior. No persistent browser queue, service worker, or promise of lossless delivery is provided. A browser may close after the start and before the terminal event, or vice versa.

HTTP 408, 429, network failures, request timeout, and 5xx are retried within the retry budget. Other non-success statuses are permanent rejections and counted without retry. Exhausted batches are dropped, not kept forever. Event UUID uniqueness makes repeated accepted transport batches idempotent. No argument, result, error-message or payload logging occurs in the SDK.

Allowlisted labels are an integration contract: configure the same values in Setup before using them. Unknown fields or labels make the whole batch fail validation. A public identifier can be copied and abused; rotation immediately revokes it and requires replacing it in deployed clients.
