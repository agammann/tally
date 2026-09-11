# Metric definitions

The pure shared analytics implementation in `packages/shared/src/metrics.ts` is used by the report API. Dashboard rendering, JSON export and all dashboard WebMCP tools read that same report API. There is no independently computed UI denominator and no derived counter store to drift after deletion.

## Invocation reconciliation and cohort

Identifiers are scoped to the server-resolved project. Event IDs are unique by `(projectId,eventId)`. Identical network retries are ignored; the first persisted body for an event ID wins. Distinct event IDs sharing an invocation are reconciled together, regardless of arrival order.

An invocation's earliest observed client start timestamp anchors the standard report cohort. Periods use UTC **[from,to)**, and all terminal observations for those invocations are considered, even when their client/receipt times are outside the period. Matching environment, release, source and tool come from the same reconciled invocation; mismatched invocation metadata produces conflict.

| Metric | Definition |
|---|---|
| Calls started | Distinct invocations with an observed start in the cohort |
| Successes / failures | Distinct started invocations with an unambiguous corresponding terminal |
| Cancellation | Started invocations with an observed cancellation terminal |
| Incomplete | Started invocations without an observed terminal; pending execution or missing telemetry |
| Unknown / conflicted | Explicit unknown outcome, contradictory terminal signatures, or inconsistent invocation metadata |
| Success rate | successes / (successes + failures) |
| Exclusions | cancellation, incomplete and unknown/conflicted counts shown beside success rate |
| Latency | Unambiguous successes and failures with an observed start and duration; sample size shown |

Equal duplicate terminal signatures do not inflate counts. Different outcome, duration, or normalized error-code signatures mark the invocation conflicted, even if two outcomes happen to agree. Conflicted invocations contribute neither definitive outcome rates nor latency. Raw observations remain stored. Unavailable rates or percentiles are `null` and displayed as **—**, never a synthetic zero.

Terminal-only invocations do not increase calls or standard success/failure counts. They appear in **missing-start records**, cohorted by their latest receipt timestamp and filtered with their own reported metadata. The distinction prevents an invented start from moving denominators.

Duration is reported using the SDK's monotonic clock in milliseconds. Cancellation/unknown/incomplete durations are excluded from latency. The median is the middle value for odd sample sizes or average of the two middle values for even samples. p95 uses nearest rank: sorted sample at `ceil(0.95*n)-1`. The canonical fixture has 10 starts, 6 success, 2 failure, 1 cancellation, 1 incomplete, and durations 100–800 ms on successes/failures: **75% success rate, 450 ms median, 800 ms p95, n=8**.

Trend buckets begin at report `from`, span 24 hours, and may end with a shorter final bucket. They show started calls and final observed failures belonging to each bucket's start cohort; this is not website traffic.

## Workflow

Each project initially has one immutable workflow name, definition version 1 and 1,800,000 ms (30 minute) window. The server snapshots the definition/version/window onto workflow-associated events. A new workflow definition requires a new project; changing other project settings cannot rewrite historical definitions.

Deduplicate by project/workflow UUID. The earliest workflow start anchors the cohort and its stored window determines the deadline. Only starts whose deadlines have elapsed at report generation enter the denominator. A completion with client timestamp from the start through the deadline, inclusive, counts once. Repeated completion events cannot increase completion count. Newer starts remain **open**, even if an early completion was already observed. Matured starts without an in-window completion appear as **missing completion**. Completion events lacking a start appear separately. Conflicting workflow metadata is excluded and counted explicitly.

Workflow reports use the period, environment, source and release filters. A tool filter limits tool reports and does not remove workflows from their denominator; this is stated in the UI. The correlated execution timeline uses the same opaque workflow ID, with at most 100 displayed workflows and 100 executions per workflow. Recent invocation lists and missing-start lists show at most 100 records, and failure groups at most 100; aggregate sample counts remain complete within the 50,000-event project report limit.

The label is **observed workflow completion**. It is not proof of payment, revenue, causal conversion attribution, caller identity or business correctness.

## Comparisons and late data

Release tables display each release's first/last start timestamps, calls, latency sample size and rates under the active filters. These release cohorts may span different time distributions; observed differences do not establish causality. Time comparisons use the preceding period of exactly equal duration and the same filters.

Client clocks may be wrong. Ingestion accepts client times up to 5 minutes ahead and up to 7 days late, or the project retention age if shorter. Out-of-window timestamps reject the whole batch. Accepted late starts/terminals can change earlier reports and mature workflow totals. Server receipt times are retained independently and are used for freshness. Reports represent observations available when generated; they are not immutable billing ledgers.
