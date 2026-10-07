# Tally release readiness

## Version 1.0 candidate verification

Executed October 6, 2026, America/Los_Angeles, from a clean copy of main with the 1.0 release changes. Machine evidence uses October 7 UTC timestamps. The self-hosted application was built in Docker and run against a new isolated PostgreSQL volume. No production owner or existing installation data was used.

The candidate keeps schema 1 and the documented SDK behavior, corrects the README's archive destination for pnpm 11, adds a stable install/upgrade contract, and distributes the dependency-free SDK through a checked GitHub release pipeline. The public npm scope remains provisional and unpublished. Sharp 0.35.5 replaces the affected 0.35.4 dependency; the other direct framework and runtime versions are unchanged.

| Check | Actual local result |
| :--- | :--- |
| Fresh source and dependency install | All 101 original tracked blobs matched main before edits. Frozen pnpm 11.19.0 install passed with Node 24.19.0. |
| Static and production checks | Root and workspace TypeScript checks, 16 unit tests, SDK/shared builds, both Next.js production builds, and the production Docker build passed. |
| README SDK packaging | The exact documented pack command produced `artifacts/tally-local-sdk-1.0.0.tgz` in the checkout. Its ESM, CommonJS, declaration, README, MIT license and dependency-free manifest checks passed; SHA256 sidecar and combined checksums were generated. |
| New owner browser flow | Fresh owner setup and sign-in, project creation, real reference ingestion, failure/slow/cancellation scenarios, persisted simulated checkout, release comparison, workflow view, and desktop/mobile checks passed. Page identity, nonblank content, framework overlay, console and page-error checks passed. |
| Strict collector integration | 13 checks passed, including the known 75%/450 ms/800 ms fixture, concurrent duplicate delivery, authentication, allowlists, schema rejection, quotas, rotation, export, deletion and expired sessions. |
| Independent SDK consumer | A fresh directory outside the workspace installed the 1.0 archive with npm 11.9.0, compiled TypeScript, preserved one ESM callback and sent accepted collector requests. A separate CommonJS consumer also preserved callback behavior. |
| Native WebMCP | Playwright 1.63.0 with Chromium 153.0.8010.12 and `--enable-features=WebMCPTesting` used the real draft APIs without a polyfill. Three dashboard tools, visible filter change, unauthorized-project rejection and seven persisted reference events covering success/failure/cancellation passed. Tools disappeared after sign-out. |
| Operations | Database restart preserved 44 events; binary backup/restore row counts matched in a separate database; additive migration, complete invocation retention and cleanup passed. Owner recovery revoked the old session, changed the password and preserved both existing projects. |
| Capacity fixtures | The 50,000-event calculation fixture and a local 5,000-event/ten-report HTTP workload passed. These are bounded local checks, not a general throughput guarantee. |
| Production dependency audit | Zero known advisories after the Sharp patch on October 6. This remains a dated advisory database result. |
| Release publication guard | Seven local API simulations passed main-only mutation, complete draft assets, exact tag, digest failure, draft retry and published-release immutability. Actual release publication is separately gated by the full GitHub verification job and verified uploaded asset hashes. |

The browser flow ran on `http://localhost:4327` with the reference app on port 4328 and a fresh database on 55457, using temporary QA copies to adapt test URLs. The documented installation defaults remain 3000, 3001 and 55487. Desktop was 1280 × 720 and mobile was 390 × 844. The Browser plugin was unavailable in that test session; regular Playwright supplied the rendered checks. Firefox, Safari, arbitrary deployment scale and the separate hosted D1 service were not re-certified by this self-hosted run.

The [v1 contract](V1.md) defines the supported scope and stopping point. The GitHub Actions job retains exact-run SDK and verification artifacts; its publisher checks the release tag's commit and uploaded asset digests before making a release public. Dependency redistribution obligations and operator controls below still apply.

## Historical 0.1 assessment

Assessment completed September 10, 2026, America/Los_Angeles. Machine evidence uses UTC, including September 11 timestamps.

Licensing update October 5, 2026: project source and SDK are released under the [MIT License](../LICENSE). The executed checks below retain their original assessment dates.

The hosted service's October 2, 2026 native dashboard checks are documented separately in [compatibility](COMPATIBILITY.md#hosted-dashboard-verification), with [compact results](verification/hosted-native-results.json). The assessment below covers the self-hosted edition.

**Evidence supports a first release for small private installations.** The SDK, collector, dashboard and reference application work with real persisted telemetry. Broader commercial distribution needs dependency obligation review, deployment specific HTTPS and access controls, and capacity validation for the intended workload. No paid service or AI API key is required.

## Implemented

TypeScript SDK 0.1.0 with independent event schema 1; strict PostgreSQL ingestion; owner authentication and multiple projects; shared volume, outcome, error, latency, workflow and comparison reports; authenticated export and project management; native browser adapter; three dashboard tools; fictional reference storefront; explicit migrations; container operation; retention, backup, restore and recovery procedures.

The dashboard uses stored observations. The storefront saves fictional orders in browser storage before recording completion. Native callbacks, manual tests and ordinary application controls use distinct application reported source labels. Source labels and business outcomes are not independent proof of caller identity or business truth.

## Executed verification

| Check | Actual result |
| :--- | :--- |
| Strict TypeScript | Root `pnpm exec tsc --noEmit` passed. |
| SDK and metrics | 12 Vitest tests passed: preserved callback behavior, errors/cancellation, privacy, classification failure, bounded transport, disabled collection, metric cohorts and workflow windows. |
| Known metric fixture | Persisted 10 starts, 6 successes, 2 failures, 1 cancellation and 1 incomplete produced 75% success, 450 ms median and 800 ms nearest rank p95. |
| Collector and access controls | 13 integration checks passed, including ten concurrent duplicate deliveries, out of order reconciliation, conflicts, missing starts, strict rejection, quotas/rate limits, private reads, rotation, deletion, session expiry and disabled signup. |
| Production browser | Chromium test passed owner login, project creation, actual reference ingestion, failure inspection, slow/cancelled calls, durable simulated checkout, release comparison, workflow display and mobile overflow checks. The suite also passed in 7.7 seconds against the Docker production app after removing the disposable QA owner, exercising clean first-owner bootstrap again. |
| Independent SDK installation | Versioned archive installed outside the workspace dependency graph; declarations compiled; ESM consumer executed once and its actual collector request was accepted. |
| Native WebMCP | Flagged Chromium 153.0.8010.12 used real `document.modelContext.getTools/executeTool` without a polyfill. All three dashboard tools worked, filters visibly changed, and seven storefront events persisted with native success, failure and cancellation outcomes. |
| Persistence and restore | Restart preserved 92 events. Custom format backup restored to a separate database with matching counts. The documented backup CLI separately restored 92 events into `tally_restore_final`, then that disposable database was removed. |
| Upgrade | Initial schema plus representative existing project/invocation upgraded through the additive index migration without losing records. |
| Retention | Entire expired invocation removed, including a recently received duplicate terminal. No derived aggregate table remains to drift. |
| Owner recovery | Actual recovery command changed the password, revoked the previous session, rejected the old password, accepted the new password and preserved all projects. |
| Production builds | SDK ESM/CommonJS/declarations and both Next.js production builds passed locally and in Docker. Compose migration completed and app/database health checks passed. |
| Dependencies | `pnpm audit --prod` reported no known vulnerabilities on September 10. This is an advisory database result, not a dependency source audit. |
| Security | Standard Codex Security source scan completed. One constrained CPU amplification issue was confirmed in the original snapshot and fixed before publication. The environment ignore gap was corrected before any source commit. |

Machine evidence is in [verification](verification/). The screenshot [desktop](assets/dashboard-desktop.png) and [mobile](assets/dashboard-mobile.png) views show real reference observations from the ordinary browser test. Their native status correctly says unavailable because that suite runs without the testing flag. Native evidence comes from the separate flagged browser.

## Measured performance

[PERFORMANCE.json](PERFORMANCE.json) records the September 8 local workload: 5,000 events, 2,500 invocations, batches of 50, five concurrent ingestion requests and ten reports. Ingestion measured 1,087 events/second with 240 ms p95 request latency; reports measured 285 ms p95. The host was Windows on a Ryzen 7 7840HS with Node 24.19.0 and PostgreSQL 17.9 in Docker.

After the security correction, a separate boundary fixture calculated 25,000 workflows and 25,000 invocations from 50,000 events in 468 ms on the September 10 run. It verified aggregate counts and all 100 returned workflow correlations. This is a local calculation measurement, not a guarantee for a network request or other hardware. The original quadratic implementation's wall clock delay was not measured.

## Explicit limits and remaining release decisions

1. Reports reject projects with more than 50,000 retained events, even for a short requested period. They return an explicit 422 instead of silently truncating aggregate data. Daily ingestion quota defaults to 100,000 and does not raise this report ceiling. Set quotas and retention for a small private workload; increasing scale requires a different query/aggregation strategy.
2. Telemetry is best effort. Queue overflow, unload, network failures and exhausted retries can lose events. The SDK does not promise lossless delivery, browser storage persistence or exactly once transport.
3. This self-hosted native assessment covers the documented flagged Chromium 153 version. No claim covers unwrapped callbacks, declarative forms, rejection before callback entry, other browsers or automatic provider attribution. The separate hosted Chrome 154 check is recorded in [compatibility](COMPATIBILITY.md).
4. SDK 0.1.0 preserves ordinary synchronous values and native Promise outcomes. It does not treat custom thenables as promises. Promise object identity is not preserved.
5. One owner, up to 20 projects, one named workflow per project, immutable workflow definition and 30 minute observation window. New workflows remain open until the window matures, including those already completed early.
6. Remote HTTPS, secure host access, Windows file ACLs, backup encryption/expiration and retention scheduling are operator responsibilities. These checks cover the self-hosted PostgreSQL edition. The hosted D1 service linked from the README is a separately maintained Sites deployment; this historical assessment does not certify it. The container favors a reproducible source build and includes build dependencies; its measured local image is approximately 4 GB.
7. Package namespace and product naming rights have not been established. `@tally-local/sdk` is a provisional local archive name. No npm publication has been made. Source and SDK are licensed under the [MIT License](../LICENSE).
8. [DEPENDENCIES.json](DEPENDENCIES.json) inspected 222 installed package manifest license fields. Flagged families include LGPL in a Sharp native package, MPL in Lightning CSS, CC BY in caniuse data and composite license expressions. These need distribution specific review and appropriate notices/source obligations before commercial redistribution. No legal clearance is claimed.
9. CI configuration is supplied. Local execution evidence above is distinct from a GitHub Actions run. Consult the repository Actions page for the result on a particular public commit.

No essential feature is a placeholder. No external credential blocked the local checks. The stated limits constrain the supported first release and broader distribution readiness.

## Security report context

The generated Codex Security report is delivered separately as `tally-security/report.md`, alongside sealed canonical JSON. It records the original unversioned snapshot. The workbench explicitly notes that source changed during the scan because the builder applied the verified corrections. It must not be described as an immutable audit of the later public commit. The recorded finding remains visible as historical evidence and its text states that it was fixed before publication.
