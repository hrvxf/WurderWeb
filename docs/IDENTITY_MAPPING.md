# Identity Mapping (user <-> player <-> org)

## Purpose

Define the canonical identity model so Codex changes keep authorization and data linkage correct across web/app flows.

## Canonical IDs

- `userId` / account identity: Firebase Auth `uid`.
- `playerId` / gameplay identity: game-scoped player identifier (often username-based), not guaranteed to equal `uid`.
- `orgId` / business identity: organization document id.

## Source-of-Truth Paths

- User profile identity:
  - `users/{uid}` (canonical profile for members area)
  - `accounts/{uid}` (fallback source for username fields during bootstrap/create-game mapping)
- Game ownership identity:
  - `games/{gameCode}.createdByAccountId` (`uid`)
  - `games/{gameCode}.managerAccountId` (`uid`, optional)
  - `games/{gameCode}.orgId` (`orgId`, optional)
- Organization identity:
  - `orgs/{orgId}` (canonical)
  - `organizations/{orgId}` (legacy mirror)
  - `orgs/{orgId}/managers/{uid}` and legacy mirror equivalent

## Mapping Rules

1. User -> Player
   - On game creation, `hostPlayerId` must be derived from account identity mapping:
     - prefer `accounts/{uid}.usernameLower`
     - fallback `accounts/{uid}.username`
     - fallback `uid`
   - Always write `createdByAccountId = uid` even when `hostPlayerId` is username-based.

2. User -> Org
   - `ownerAccountId` is always a Firebase `uid`.
   - Organization manager membership doc id is the same `uid` (`managers/{uid}`).
   - New org writes must mirror to both `orgs` and `organizations` paths until legacy removal.

3. Player -> User
   - Do not assume `playerId === uid`.
   - For gameplay/admin diagnostics, treat player identity as game-scoped and use explicit `uid` fields when present on player docs.
   - Authorization must never rely on player roster ids; it must use account ids (`uid`) from auth token.

4. Game -> Org
   - If a game belongs to an org, write `games/{gameCode}.orgId`.
   - Also write org-game link docs:
     - `orgs/{orgId}/games/{gameCode}`
     - `organizations/{orgId}/games/{gameCode}` (legacy mirror)

## Authorization Decision Order

For manager game access (`/manager/[gameCode]`), evaluate in this order:

1. `games/{gameCode}.createdByAccountId === auth.uid`
2. `games/{gameCode}.managerAccountId === auth.uid`
3. `games/{gameCode}.orgId -> orgs/{orgId}.ownerAccountId === auth.uid`
4. Legacy fallback: `organizations/{orgId}.ownerAccountId === auth.uid`
5. Deny

For org route access (`/org/[orgId]`), evaluate in this order:

1. `orgs/{orgId}.ownerAccountId === auth.uid`
2. `orgs/{orgId}/managers/{uid}` active membership
3. Legacy owner/membership checks in `organizations/{orgId}`
4. Deny

## Codex Guardrails

- Use `uid` for auth and ownership checks; never use email, display name, or `playerId`.
- Keep canonical+legacy mirror writes paired for org entities (`org`, `managers`, `games`, `templates`) until migration is explicitly removed.
- When adding new APIs, return enough identity fields to avoid client-side guessing (`uid`, `orgId`, `createdByAccountId`, `managerAccountId` as applicable).
- Preserve backward compatibility for old games where host/player linkage may still be uid-based.

## Current Implementations

- Game creation and host player resolution:
  - [src/lib/game/create-game.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/game/create-game.ts)
- Manager game access checks:
  - [src/lib/manager/access.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/manager/access.ts)
- Org access checks:
  - [src/lib/org/access.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/org/access.ts)
- Org creation/linking/template mirror writes:
  - [src/lib/game/company-config.ts](/c:/Users/adamj/Documents/Wurder/wurder-website/src/lib/game/company-config.ts)
- Members profile canonical path:
  - [docs/MEMBERS_AREA.md](/c:/Users/adamj/Documents/Wurder/wurder-website/docs/MEMBERS_AREA.md)
