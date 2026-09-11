# Changelog

## 0.1.0 — 2026-09-08

Initial private-use candidate: dependency-free SDK, schema-v1 ingestion, PostgreSQL persistence and migrations, Better Auth owner login/recovery, multi-project dashboard, shared outcome/latency/workflow/release reports, bounded export, native WebMCP adapter and three dashboard tools, independent SDK archive test, fictional reference storefront, Docker Compose and operational verification scripts.

Schema version is 1 and independent of SDK version 0.1.0. New schema versions are rejected until explicitly supported. Second database migration adds a retention/report lookup index and preserves existing event records.

Explicitly excluded: billing, registration/invitations, visitor identification, automatic caller-provider identification, website scanning, general traffic analytics, alerts, replay and embedded AI. No SDK publication, paid infrastructure or public application deployment is performed. Public source repository was created at the owner's explicit request; no software license grant has been selected.
