# Implementation checklist

- [x] Inspect workspace, GitHub account, WebMCP draft and local runtimes
- [x] Database, owner authentication, projects
- [x] Validation, persistent ingestion and limits
- [x] SDK behavior and delivery tests
- [x] Reference storefront
- [x] Dashboard, workflow, comparison, WebMCP adapter
- [x] Independent package installation
- [x] Containers, retention, restore and upgrade exercises
- [x] Browser checks, release artifacts and evidence

# Decision log

2026-09-08: Empty workspace and no Tally repository found under connected account agammann. Build locally. The user subsequently explicitly authorized a public GitHub repository and source publication. Local package scope is provisional and unclaimed; no license grant.

Use Next.js 16, React 19, Prisma 6.19 (supported by Better Auth's adapter), PostgreSQL 17, Better Auth 1.7, Node 24, pnpm 11.19. Stable exact direct dependency pins and lockfile. Keep the SDK dependency-free.

Use raw immutable events as the source of truth, reconcile at report time. Serialize ingestion per project using a PostgreSQL advisory transaction lock. Bounded reports fail explicitly when too large; no silent truncation of aggregate data. Configure explicit metadata vocabularies to bound cardinality.

Owner bootstrap requires a server-generated setup token, a database transaction, and a singleton installation row. Password hashing and sessions are delegated to Better Auth. No public sign-up endpoint. Project authorization always resolves the authenticated owner.

Dashboard design: navy rail, pale canvas, open summary strip, readable tables, green success and red failure. Generated concept is a layout reference only: all numbers and status text must come from stored observations; misleading illustrative totals/trends are discarded. Use semantic native controls and React best-practice guidance.

The user's self-hosted Next/PostgreSQL requirement overrides Sites provisioning and frontend skill defaults. No public deployment, paid provider, package publication, or AI dependency.

2026-09-10: Completed private release verification, including native Chromium persistence, independent package installation, actual owner recovery, backup restore, additive upgrade and workflow capacity fixture. Security review found a quadratic workflow lookup in the initial local snapshot; indexed invocations by workflow and bounded detail construction. Corrected environment ignore rules before staging and made direct production startup use loopback. Container startup retains a separate internal all-interface listener behind the loopback port mapping.

Visual fidelity review: retained the generated concept's navy navigation, pale canvas, summary strip, chart and outcome panels, and readable tool table. Added the required source/release controls, exact UTC boundaries, excluded outcome counts and true native status. Replaced illustrative totals with real stored reference observations. Mobile uses a stacked layout, horizontal table scrolling and a visible sign-out action. Disabled chart animation for stable data rendering. Desktop and mobile screenshots were visually inspected; no document-level horizontal overflow was observed at 390 px width.
