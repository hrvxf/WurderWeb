# Business Session Dashboard Access Control

Canonical route: `/business/sessions/[gameCode]`
Legacy redirect: `/manager/[gameCode]`

## Canonical Ownership Check Path

Server-side access validation uses this order:

1. Verify Firebase ID token from `Authorization: Bearer <token>`.
2. Load `games/{gameCode}`.
3. Allow if `games/{gameCode}.createdByAccountId === auth.uid`.
4. Allow if `games/{gameCode}.managerAccountId === auth.uid` (optional direct business host binding).
5. If `games/{gameCode}.orgId` exists, load `orgs/{orgId}` and allow if `ownerAccountId === auth.uid` (legacy fallback `organizations/{orgId}`).
6. Deny otherwise.

Implementation: [src/lib/manager/access.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/manager/access.ts)

## Protected API Endpoints

- Access probe (canonical): [src/app/api/business/sessions/[gameCode]/access/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/business/sessions/[gameCode]/access/route.ts)
- Access probe (legacy compatibility wrapper): [src/app/api/manager/games/[gameCode]/access/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/manager/games/[gameCode]/access/route.ts)
- Dashboard data: [src/app/api/manager/games/[gameCode]/dashboard/route.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/app/api/manager/games/[gameCode]/dashboard/route.ts)

Both endpoints enforce the same server-side ownership check.

Legacy wrapper notes:

- `/api/manager/games/[gameCode]/access` forwards to the canonical Business route.
- legacy wrapper emits `x-legacy-surface: manager-games-access` and server telemetry logs.

## Client Guard

Reusable guard hook: [src/lib/auth/use-manager-route-guard.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/auth/use-manager-route-guard.ts)

`ManagerDashboardPage` uses this hook to render explicit states:

- loading auth/access
- unauthenticated
- forbidden
- allowed (dashboard content)

## Related Architecture

- [docs/B2B_WEB_APP_ARCHITECTURE.md](/c:/Users/adamj/Documents/Wurder/wurder-website/docs/B2B_WEB_APP_ARCHITECTURE.md)
