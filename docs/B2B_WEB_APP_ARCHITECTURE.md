# B2B Web + App Architecture

## Purpose

Define how the B2B manager web product relates to core Wurder game/app data so changes stay aligned.

## System Boundaries

- Mobile app owns gameplay event generation and game state transitions.
- Web B2B surfaces manager/org workflows, dashboards, and exports.
- Firestore is the shared contract between app and web.
- Web dashboard/export paths read aggregated analytics (`gameAnalytics/{gameCode}`), not raw event streams.

## Canonical Data Paths

### Game and ownership

- `games/{gameCode}`
  - ownership linkage: `createdByAccountId`, optional `managerAccountId`, optional `orgId`
  - manager config: `managerConfig`, `analyticsEnabled`, optional `templateId`

### Organisation model (canonical + legacy mirror)

- Canonical:
  - `orgs/{orgId}`
  - `orgs/{orgId}/managers/{uid}`
  - `orgs/{orgId}/games/{gameCode}`
  - `orgs/{orgId}/templates/{templateId}`
- Legacy mirror for compatibility:
  - `organizations/{orgId}`
  - `organizations/{orgId}/managers/{uid}`
  - `organizations/{orgId}/games/{gameCode}`
  - `organizations/{orgId}/templates/{templateId}`

### Analytics model

- `gameAnalytics/{gameCode}` is the canonical analytics read for web manager/org reporting.
- Web reads normalized fields such as:
  - `overview`
  - `insights`
  - `playerPerformance`
  - `sessionSummary`
  - `updatedAt`

## Access and Entitlements

### Manager route access (`/manager/[gameCode]`)

Server-side ownership check order:

1. `games/{gameCode}.createdByAccountId === auth.uid`
2. `games/{gameCode}.managerAccountId === auth.uid`
3. `games/{gameCode}.orgId -> orgs/{orgId}.ownerAccountId === auth.uid` (legacy fallback `organizations`)

Implementation:

- `src/lib/manager/access.ts`
- `src/app/api/manager/games/[gameCode]/access/route.ts`

### Organisation route access (`/org/[orgId]`)

- owner/member checks against canonical and legacy org collections.
- implementation: `src/lib/org/access.ts`, `src/app/api/orgs/[orgId]/sessions/route.ts`

### Tier gating

- source of truth: `src/lib/product/entitlements.ts`
- enforced in server API responses and reflected in UI states.

## Route/API Relationship Map

- `/manager/[gameCode]`
  - loads access state via `/api/manager/games/[gameCode]/access`
  - loads dashboard payload via `/api/manager/games/[gameCode]/dashboard`
  - export path via `/api/manager/games/[gameCode]/export?format=csv|pdf`
- `/org/[orgId]`
  - loads org sessions + trend summary via `/api/orgs/[orgId]/sessions`
- `/admin/create-company-game`
  - creates game/org linkage via `/api/admin/create-company-game`
  - templates via `/api/admin/company-templates`

## Branding Path

Org branding lives in `orgs/{orgId}.branding` (mirrored to `organizations/{orgId}`):

- `companyName`
- `companyLogoUrl`
- `brandAccentColor`
- `brandThemeLabel`

Used by:

- manager dashboard header
- org dashboard header
- manager exports

## Design Rule

For manager/org analytics surfaces, prefer:

- API response assembled server-side from aggregated docs
- lightweight client rendering with defensive normalization
- no direct client reads of raw gameplay events
