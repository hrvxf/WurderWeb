# Organisation Data Model (Phase 8.1)

## Goals

- One organisation with many games.
- One organisation owner today, with future-safe support for multiple managers.
- Clean game-to-org linkage for company sessions.
- No invitations, billing, or complex permission framework yet.

## Canonical Collections

1. `orgs/{orgId}`
2. `orgs/{orgId}/managers/{uid}`
3. `orgs/{orgId}/games/{gameCode}`
4. `games/{gameCode}` with `orgId` on the game document

## Legacy Compatibility

Current code also writes mirrored records to:

- `organizations/{orgId}`
- `organizations/{orgId}/managers/{uid}`
- `organizations/{orgId}/games/{gameCode}`

This keeps existing flows and checks working while moving canonical modeling to `orgs`.

## Ownership Path

For business session access (canonical `/business/sessions/[gameCode]`, legacy `/manager/[gameCode]`):

1. Read `games/{gameCode}`.
2. If `createdByAccountId === auth.uid`, allow.
3. If `managerAccountId === auth.uid`, allow.
4. If `orgId` exists:
   - check `orgs/{orgId}.ownerAccountId`
   - fallback to `organizations/{orgId}.ownerAccountId`
5. Deny otherwise.

## Org Tier Field

`orgs/{orgId}` now includes `tier` (`basic` / `pro` / `enterprise`) used by web entitlement checks.

## Branding Fields

`orgs/{orgId}` now supports lightweight branding under `branding`:

- `branding.companyName`
- `branding.companyLogoUrl` (optional)
- `branding.brandAccentColor` (optional `#RGB`/`#RRGGBB`)
- `branding.brandThemeLabel` (optional)

These fields are mirrored to `organizations/{orgId}` for legacy compatibility and are used by:

- Business session dashboard header
- org dashboard header
- Business session CSV / PDF-ready exports

## Company Game Linkage

Company game creation now:

1. Creates org record and owner manager membership.
2. Creates template.
3. Creates `games/{gameCode}` with `orgId`.
4. Writes org-game link at `orgs/{orgId}/games/{gameCode}`.

## Organisation Dashboard Path

The canonical org dashboard route is:

- `/business/orgs/[orgId]`

Legacy compatibility redirect:

- `/org/[orgId]` -> `/business/orgs/[orgId]`

It loads sessions via:

- `GET /api/orgs/[orgId]/sessions`

This endpoint reads:

1. `orgs/{orgId}` (fallback: `organizations/{orgId}`) for org identity and access.
2. `orgs/{orgId}/games` (fallback: `organizations/{orgId}/games`) for session linkage.
3. `gameAnalytics/{gameCode}` for session summary metrics.
4. `games/{gameCode}` for status/date fallback.

The same endpoint also returns first-pass multi-session analytics:

- `summary.totalSessions`
- `summary.averageSuccessRate`
- `summary.averageDisputeRate`
- `summary.averageResolutionTimeMs`
- `trends[]` (session-by-session list)

## Typed Models

Typed org models are defined in:

- [src/lib/types/organization.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/types/organization.ts)
