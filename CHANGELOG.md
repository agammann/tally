# Changelog

## 2.0.0

Release preparation dated November 17, 2026.

- Deliver the previously unreleased PostgreSQL 18.4 installation change as a major operational boundary. Fresh installations require explicit empty-volume initialization and normal startup guards; existing PostgreSQL 17 installations require the documented dump-and-restore cutover and preserve their original volume for rollback.
- Require Compose 2.24.4 or later up front, route older installations through the major-version procedure before generic application migration, and gate publication on the existing real guard, dump/restore, and Compose rollback rehearsals.
- Align installation, application, image and SDK archive labels at 2.0.0 through the established coordinated publisher. The SDK API, schema 1 ingestion contract, application migrations, and existing records remain unchanged. Preserve the immutable 1.0.1 release.
- Correct Setup to display the matching SDK archive version and label its moving receipt timestamp as the last event received.
- Disconnect the reference client and native tools when its release, endpoint, or ingestion identifier changes. Reject stale native handles until explicit reconnect, preventing new business behavior from being recorded under the old release or project configuration. The real native regression fails on the previous implementation and checks a correctly labeled v2 receipt after reconnect.

## 1.0.1

Release preparation dated November 12, 2026.

- Deliver the verified dependency fixes accumulated since 1.0.0 in a new source release, including patched authentication, framework, validation, and development tooling. Vite 8.2.6 and its patched Rolldown dependency address GHSA-p4f5-76q4-ffq7; Tally serves Next.js and does not expose a Vite development server by default.
- Upgrade Prisma CLI, client, and PostgreSQL adapter together to 7.10.1. Keep the existing database models and migration history, support credentialless builds, and verify transaction rollback, database selection, and ORM/raw-query schema consistency. See the operations guide for the adapter's connection pool settings.
- Verify native WebMCP execution with Playwright 1.65 and flagged Chromium 158, retaining persisted success/failure/cancellation and owner recovery checks.
- Align installation, application, container, and SDK labels at 1.0.1. The SDK remains dependency-free with the same public API and event schema 1. Publish a new immutable tag and SDK assets after the complete release gate passes; leave 1.0.0 unchanged.

## 1.0.0

Release preparation dated October 6, 2026.

- Define the supported private-installation scope, schema 1 compatibility, SDK API stability, and upgrade procedure.
- Align installation, SDK, reference application and local container version labels at 1.0.0. Existing data and event schema remain unchanged.
- Supply a versioned SDK archive and SHA256 checksums through a main-only release job after the full application, independent consumer, native browser and operations checks pass. Source archives are supplied by GitHub for the same release tag.
- Derive the independent consumer archive name from the SDK version and install it in a fresh temporary directory outside the workspace.
- Update the Sharp dependency to 0.35.5 for the upstream librsvg advisory. Framework and direct dependency versions remain unchanged.

## 0.1.0 — 2026-09-08

Initial private-use candidate: dependency-free SDK, schema-v1 ingestion, PostgreSQL persistence and migrations, Better Auth owner login/recovery, multi-project dashboard, shared outcome/latency/workflow/release reports, bounded export, native WebMCP adapter and three dashboard tools, independent SDK archive test, fictional reference storefront, Docker Compose and operational verification scripts.

Schema version is 1 and independent of SDK version 0.1.0. New schema versions are rejected until explicitly supported. Second database migration adds a retention/report lookup index and preserves existing event records.

Explicitly excluded: billing, registration/invitations, visitor identification, automatic caller-provider identification, website scanning, general traffic analytics, alerts, replay and embedded AI. No SDK publication, paid infrastructure or public application deployment is performed. Public source repository was created at the owner's explicit request; no software license grant has been selected.
