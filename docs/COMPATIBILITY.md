# WebMCP compatibility

Checked **2026-09-08 (America/Los_Angeles)** against the live official sources:

- [webmachinelearning/webmcp repository and explainer](https://github.com/webmachinelearning/webmcp)
- [Editor’s draft specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome implementation guide](https://developer.chrome.com/docs/ai/webmcp), last updated 2026-08-07
- [Chrome imperative API guide](https://developer.chrome.com/docs/ai/webmcp/imperative-api)

The current explainer uses `document.modelContext.registerTool`, with a registration AbortSignal for cleanup. The draft invokes the imperative callback with `(input, {signal})`. Results are serialized from the callback’s fulfillment value; rejected promises signal execution failure. Browser cancellation can reject the caller while the page callback continues or races with completion. Tally records only the callback outcome it actually observes. Tally's optional `{isError:true}` convention is **application result classification**, not a claim that the current draft standardizes that property.

Chrome documents an origin trial from version 149 and a local testing flag at `chrome://flags/#enable-webmcp-testing`, requiring relaunch. WebMCP is origin-isolation and `tools` permissions-policy gated. APIs can change; supported detection is runtime capability detection, not version sniffing. No extension or AI key is required by Tally.

## Self-hosted adapter surface

`packages/shared/src/webmcp.ts` owns browser registration. It feature-detects `document.modelContext.registerTool`, passes registration cancellation, and uses `unregisterTool(name)` only when an implementation provides that older cleanup method. It never monkey-patches the browser or makes the presence of an API a proof of execution. Failed registration cleans up registered names where supported and leaves ordinary UI working. No old `navigator.modelContext` registration fallback is silently treated as draft compatibility.

The authenticated dashboard registers `get_tool_metrics`, `get_tool_failures`, and `set_dashboard_filters`. Each validates strict input, uses bounded UTC ranges and shared server reports, and applies server ownership checks. `set_dashboard_filters` visibly updates the same filter state used by UI controls. Reporting tools are not instrumented into customer projects. Unauthenticated pages register none.

The storefront registers `search_products`, `check_delivery`, and `add_to_cart`. Their native wrapper path explicitly sets `webmcp`; ordinary controls use `application` and manual diagnostic buttons use `manual`. Its checkout persists the fictional order before recording completion. Native caller identity and business correctness are not independently verified.

## Hosted dashboard verification

On October 2, 2026, the signed-in [hosted dashboard](https://tally.alx21.chatgpt.site/dashboard) passed native checks in **Google Chrome 154.0.8037.98 on Windows**, with WebMCP testing enabled and **WebMCP - Model Context Tool Inspector 1.9.18**. The inspector's Execute Tool controls invoked the browser's native tools; no model API key was used.

The hosted tools are `get_tally_summary`, `get_workflow_completion`, and `list_tool_failures`. Each accepts `{}` and reads the current project and visible filters. Together, their results matched the expected stored observations: six calls, four successes, one failure, one cancellation, and an 80% success rate; one completed workflow after its real 30-minute window; and one `CHECKOUT_UNAVAILABLE` failure. Selecting the visible `manual` source filter returned two successful calls at 100%; clearing it restored the original summary.

All three rejected an unexpected argument. Navigating to the integration guide removed the registrations; returning to the dashboard restored all three, and a fresh summary call matched the original. See the [compact hosted evidence](verification/hosted-native-results.json). This check covers the hosted read tools. It did not capture console errors or evaluate other browser-agent products.

## Self-hosted verification paths

Verified again September 10, 2026 in Playwright Chromium **153.0.8010.12**, with `--enable-features=WebMCPTesting`. The implementation accepts JSON encoded string arguments in `executeTool`, consistent with Chrome's imperative guide; older explainer examples using an object are not interchangeable with this tested implementation.

| Capability | Executed result |
| :--- | :--- |
| Registration | Real `document.modelContext` registration and discovery succeeded. No navigator registration fallback or polyfill. |
| Dashboard reads | All three expected tools discovered; metrics and failures returned authorized shared reports. |
| Dashboard filter mutation | `set_dashboard_filters` changed the visible execution source control to `manual`. |
| Native storefront success | `search_products` returned serialized product data and a stored success event. |
| Native storefront failure | v1 delivery failure rejected the native caller with browser `UnknownError`; SDK stored normalized failure. |
| Native cancellation | Caller rejected with `AbortError`; callback also rejected and SDK stored cancellation. |
| Persistence | Seven newly received native events verified in PostgreSQL, including the three terminal outcomes above. |
| Ordinary browser | Separate suite without the flag retained working UI and explicitly displayed unavailable native support. |

See [compact native evidence](verification/native-results.json). The native test waits for the visible flush completion before inspecting storage; a click alone is not persistence evidence. Other browsers and external agent products have not been verified.

The browser suite covers manual/application paths separately from the native test. `scripts/native-check.ts` launches a separate Playwright Chromium with `--enable-features=WebMCPTesting`, records its exact version and capabilities, and uses the real browser `getTools` / `executeTool` APIs if present. It installs **no polyfill**. Missing draft capabilities produce an explicit unverified result, not a simulated pass. See `RELEASE-READINESS.md` and the released native evidence for the actual run.

To verify natively on a compatible interactive Chrome:

1. Enable the official local testing flag and relaunch; use a local or HTTPS origin with no `Origin-Agent-Cluster: ?0` override.
2. Sign in to Tally. Verify the three dashboard tools are discoverable. Supply an authorized project UUID and a UTC period no longer than 31 days to the metrics/failures tools. Confirm definitions, period, sample counts and freshness match the visible dashboard.
3. Call `set_dashboard_filters` with `source: "manual"` (or a configured environment). Verify the controls and rendered report update. Try a random unauthorized project UUID and confirm no report is returned.
4. Connect the reference storefront to its own project. Start a fresh task instance. Invoke `search_products` and `add_to_cart` through the browser API or an external browser agent; verify visible results/cart and stored `webmcp` events.
5. Set v1 / failure and invoke `check_delivery`; inspect normalized failure. Select v2, reconnect, invoke the same scenario, and compare stored release cohorts.
6. Set cancellation, invoke delivery with an AbortSignal, abort during the pending operation, then flush. Confirm callback rejection/cancellation observation in stored data. Separately verify a callback that ignores cancellation and returns successfully is reported as success by the SDK unit test.
7. Navigate away or sign out and verify registration cleanup. Never call private callback functions manually and describe that as native verification.

No native readiness claim extends to unwrapped tools, declarative forms, pre-execution browser rejection, automatic agent/provider attribution, unsupported browsers, or cancellation that never reaches or settles the callback. Manual and ordinary UI remain operational when native support is absent.
