# Product Tiers (Phase 9.1)

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
- core manager dashboard access

### Pro

- all Basic features
- manager insights
- manager summaries

### Enterprise

- all Pro features
- org dashboard
- template reuse
- exports (manager CSV + PDF-ready report path)
- branding (org brand fields applied to manager/org headers + exports)

## Entitlement Application (Web)

- Manager dashboard API returns tier entitlements and UI gates insights/summaries.
  - [src/app/api/manager/games/[gameCode]/dashboard/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/manager/games/[gameCode]/dashboard/route.ts)
  - [src/components/admin/ManagerDashboardPage.tsx](/c:/Users/adamj/Documents/Wurder/wurder-website/src/components/admin/ManagerDashboardPage.tsx)
- Org dashboard endpoint is enterprise-gated with feature-locked messaging.
  - [src/app/api/orgs/[orgId]/sessions/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/orgs/[orgId]/sessions/route.ts)
  - [src/components/admin/OrganizationDashboardPage.tsx](/c:/Users/adamj/Documents/Wurder/wurder-website/src/components/admin/OrganizationDashboardPage.tsx)
- Template APIs and template UI are enterprise-gated.
  - [src/app/api/admin/company-templates/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/admin/company-templates/route.ts)
  - [src/app/(admin)/admin/create-company-game/page.tsx](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/(admin)/admin/create-company-game/page.tsx)
- Export APIs and export buttons are enterprise-gated.
  - [src/app/api/manager/games/[gameCode]/export/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/manager/games/[gameCode]/export/route.ts)
  - [src/components/admin/ManagerDashboardPage.tsx](/c:/Users/adamj/Documents/Wurder/wurder-website/src/components/admin/ManagerDashboardPage.tsx)
- Branding fields are enterprise-scoped and applied on manager/org surfaces.
  - [src/lib/types/organization.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/types/organization.ts)
  - [src/app/api/manager/games/[gameCode]/dashboard/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/manager/games/[gameCode]/dashboard/route.ts)
  - [src/app/api/orgs/[orgId]/sessions/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/orgs/[orgId]/sessions/route.ts)

## Org Tier Storage

Organization docs now include `tier`:

- [src/lib/types/organization.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/types/organization.ts)
- default for newly created orgs is currently `enterprise`.
