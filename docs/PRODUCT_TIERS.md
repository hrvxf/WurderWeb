# Product Tiers (Phase 9.1)

Canonical product context:

- Business web workspace routes are under `/business/...` (for example `/business/sessions/[gameCode]`, `/business/orgs/[orgId]`, `/business/sessions/new`).
- Legacy `/manager/...` and `/admin/...` paths are migration compatibility surfaces only.

## Tier Model

- `basic`
- `pro`
- `enterprise`

Source of truth:

- [src/lib/product/entitlements.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/product/entitlements.ts)

## Feature Mapping

### Basic

- single session creation
- limited metrics
- core Business session dashboard access

### Pro

- all Basic features
- Business session insights
- Business session summaries

### Enterprise

- all Pro features
- org dashboard
- template reuse
- exports (Business session CSV + PDF-ready report path)
- branding (org brand fields applied to Business session/org headers + exports)

## Entitlement Application (Web)

- Business session dashboard API returns tier entitlements and UI gates insights/summaries.
  - [src/app/api/manager/games/[gameCode]/dashboard/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/manager/games/[gameCode]/dashboard/route.ts)
  - [src/components/admin/ManagerDashboardPage.tsx](/c:/Users/adamj/Documents/Wurder/wurder-website/src/components/admin/ManagerDashboardPage.tsx)
- Org dashboard endpoint is enterprise-gated with feature-locked messaging.
  - [src/app/api/orgs/[orgId]/sessions/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/orgs/[orgId]/sessions/route.ts)
  - [src/components/admin/OrganizationDashboardPage.tsx](/c:/Users/adamj/Documents/Wurder/wurder-website/src/components/admin/OrganizationDashboardPage.tsx)
- Template APIs and template UI are enterprise-gated.
  - Canonical: [src/app/api/business/templates/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/business/templates/route.ts)
  - Legacy compatibility wrapper: [src/app/api/admin/company-templates/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/admin/company-templates/route.ts)
  - Canonical product route: `/business/sessions/new`
  - Legacy compatibility route/component path: [src/app/(admin)/admin/create-company-game/page.tsx](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/(admin)/admin/create-company-game/page.tsx)
- Export APIs and export buttons are enterprise-gated.
  - [src/app/api/manager/games/[gameCode]/export/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/manager/games/[gameCode]/export/route.ts)
  - [src/components/admin/ManagerDashboardPage.tsx](/c:/Users/adamj/Documents/Wurder/wurder-website/src/components/admin/ManagerDashboardPage.tsx)
- Branding fields are enterprise-scoped and applied on Business session/org surfaces.
  - [src/lib/types/organization.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/types/organization.ts)
  - [src/app/api/manager/games/[gameCode]/dashboard/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/manager/games/[gameCode]/dashboard/route.ts)
  - [src/app/api/orgs/[orgId]/sessions/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/orgs/[orgId]/sessions/route.ts)

## Org Tier Storage

Organization docs now include `tier`:

- [src/lib/types/organization.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/types/organization.ts)
- safe-default rule: missing/unknown tier must never imply `enterprise`.
