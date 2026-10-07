# Changelog

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
