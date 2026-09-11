# Privacy, collection and ingestion

Tally records best-effort browser metadata for explicitly wrapped imperative callbacks. It cannot see unwrapped tools, declarative forms, browser schema/permission rejection before callback entry, or activity that never reaches the callback. It does not identify agent providers, visitors or sessions. A project's source and business outcome are application-reported and can be wrong or forged.

## Stored telemetry

Schema version, random event UUID, optional invocation UUID, server-resolved project, tool name/version, application release, environment, explicit source (`webmcp`, `manual`, `application`, `unknown`), client timestamp, server receipt timestamp, elapsed milliseconds, terminal outcome, allowlisted normalized error code, optional fresh workflow UUID/name, server-snapshotted workflow definition/window, and optional safe route label.

Raw arguments, results, prompts, full URLs, cookies, tokens, visitor identifiers, personal details, arbitrary error messages and stacks are not collected. SDK telemetry objects are explicitly constructed instead of copying the callback input. Owner account email/name and maintained authentication records are stored separately for administration; they are not event metadata. IP tracking is disabled in the authentication configuration. The ingestion handler does not persist request headers or IPs.

The reference storefront saves fictional simulated orders in its own browser local storage, retaining the latest 100. These order contents are not sent to Tally. No session replay, fingerprinting, traffic analytics or AI service exists in this release.

## Versioned API

`POST /api/v1/events`, `Content-Type: application/json`:

```json
{
  "ingestionId": "00000000-0000-4000-8000-000000000001",
  "events": [{
    "schemaVersion": 1,
    "eventId": "00000000-0000-4000-8000-000000000002",
    "invocationId": "00000000-0000-4000-8000-000000000003",
    "kind": "tool_started",
    "tool": "search_products",
    "environment": "reference",
    "source": "manual",
    "clientAt": "2026-09-08T12:00:00.000Z"
  }]
}
```

Examples are illustrative UUIDs/timestamps, not working credentials. The ingestion identifier is the **only** project resolution input. A client-supplied project ID is unknown schema and rejected. The public identifier grants no read, configuration, credential rotation or deletion permissions.

Only schema 1 is supported. Unknown fields, unsupported versions and unapproved metadata reject the **entire batch**, with no partial persistence. A 202 response is returned only after a PostgreSQL transaction commits, and contains accepted and duplicate counts. Unique `(projectId,eventId)` constraints and per-project transaction serialization prevent concurrent retry inflation. First persistence wins when the same event ID is reused with different content. Different terminal events sharing an invocation can create an explicit conflict instead.

HTTP statuses: 400 validation/cardinality/timestamp; 403 bad identifier/origin; 413 oversized body; 415 wrong content type; 429 project request/daily limit; 500 unexpected collector failure. Clients may retry 408, 429 and 5xx within a finite retry budget. An ambiguous network failure may occur after commit; retry the same event UUIDs. No transport exactly-once guarantee exists.

## Bounds

| Limit | Value |
|---|---|
| Request body | 65,536 bytes, counted while streaming as well as from Content-Length |
| Batch | 1–50 events |
| Label | 1–64 ASCII letters/digits/underscore/dot/colon/hyphen |
| Tool/environment/release/error/route vocabularies | Explicit project allowlists, max 100 entries each |
| Origins | 1–20 exact origins; no wildcard, path or credential component |
| Duration | 0–86,400,000 ms; SDK clips unusually long duration to this ceiling |
| Projects | At most 20 per installation |
| Ingestion requests | 120 accepted-transaction requests/minute/project, fixed UTC minute |
| New events/day | 100,000 default, configurable 100–1,000,000; duplicates do not consume new-event quota |
| Retention | 30 days default, configurable 1–365 |
| Report range | Positive UTC range, maximum 31 days |
| Report working set | Maximum 50,000 retained event rows/project; larger sets return 422, no partial aggregate |
| Display/export details | 100 recent rows, missing-start rows, failure groups and workflow timelines; 100 tool executions/workflow |
| Owner login | Global 5 attempts/minute/installation plus Better Auth's limits |

Tool version is a bounded descriptive scalar, not an unrestricted grouping dimension. All stored cardinality is further bounded by ingestion quotas and retention. Quotas protect a small private installation; they do not establish internet-scale abuse resistance. The default write allowance can exceed the report working set: choose a quota/retention appropriate for a low-volume installation and keep retained events below 50,000. An installation with higher needs requires a database-side aggregation release before adoption.

Ingestion serializes transactions for a project, with 5-second lock acquisition budget and 10-second transaction budget. Only known project origins receive preflight permission. Origin checks and CORS constrain browsers but **do not authenticate arbitrary HTTP clients**, which can send forged Origin headers. Keep a private collector behind your own network controls; the identifier is not a secret. Dashboard owner mutations require the configured exact same origin and authenticated ownership.

No raw body logging occurs. Production Next.js logs startup and operational errors; do not add proxy access logs containing request bodies, Cookie/Authorization headers, query strings or public identifiers. Use aggregate status/request-duration logging if needed. The health endpoint returns only `ok`; readiness checks the database and returns only `ready` or `unavailable`.

Retention runs explicitly on a schedule you control. It deletes whole expired workflows/invocations, including their later associated events, rather than leaving dangling derived counts. Reports recalculate from retained observations. Project deletion transactionally deletes active events, quota counters and the project; historical backup copies remain until backup expiration. See operations for backup protection and expiration.
