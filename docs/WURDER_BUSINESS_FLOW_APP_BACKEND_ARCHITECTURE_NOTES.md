# Wurder Business Flow: App and Backend Follow-up Architecture Notes

## 1. Executive summary

Wurder Web is being redesigned for B2B/business users. The public site now includes a Business entry point that routes business users into a redesigned `/business/sessions/new` flow. That flow is simpler, guided, and mode-led.

This redesign is not only a web UX update. It defines a stronger cross-layer product contract that app and backend must support:

- Canonical organisation-bound business sessions
- Mode-led configuration with business-facing language
- Explicit manager participation mode (host-only vs host-player)
- Accurate cross-mode analytics/stat semantics

This document is the implementation-prep reference for app/backend work when that phase resumes.

Web auth architecture update (March 22, 2026):

- Members-area access is now server-guarded using a Firebase session cookie (`__session`).
- Login state syncs that cookie via `/api/auth/session` (create/clear).
- Client-side guards still exist as UX fallback, but they are no longer the primary enforcement boundary.

## 2. Confirmed product decisions from the web/B2B redesign

### Public website / business entry

Status: Confirmed (with server-enforced members auth on web)

- Public Business page exists on main website.
- Business is present in top-level navigation.
- Primary CTA routes to `/business/sessions/new`.
- Logged-out users are redirected to sign-in and deep-linked back correctly.

### Business session creation flow

Status: Confirmed

- Dense admin form replaced by guided 3-step flow.
- Backend authority remains authoritative wherever possible.
- Default flow is narrow, fast, and business-friendly.

### Step 1

Status: Confirmed direction

- Organisation selection should support:
- Existing organisation selector
- Inline creation of a new organisation
- Canonical org usage instead of repeated free-text naming
- Session name should support:
- Free text
- Recent session-name suggestions scoped to selected organisation
- No raw session IDs as primary UX naming

### Step 2

Status: Confirmed

- Uses Game mode, not Purpose.
- Supported modes:
- Guilds
- Classic
- Elimination
- Mode selection shows business-facing description panel.
- Session length remains the other main choice.
- Intensity removed from default flow.

### Step 3

Status: Confirmed

- Review and create step.
- Summary includes:
- Organisation
- Session name
- Game mode
- Session length
- Manager role

### Success state

Status: Confirmed

- Inline banner replaced by dedicated success state.
- Success state shows game code.
- Success state shows QR code.
- Success state includes next-step actions.

### Manager participation

Status: Confirmed

- Manager role selector is part of create flow.
- Supported values:
- Host only
- Host participates as a player
- This is the only agreed advanced/optional configuration at this stage.
- No broad advanced settings surface for templates/branding/timings in current phase.

## 3. Canonical architecture implications for app/backend

Status: Confirmed implications

- Business sessions must be tied to canonical organisations.
- Organisation context must be reusable across session creation, reporting, and dashboards.
- Session naming is now human-facing and reusable as an operational pattern.
- Configuration is mode-led, not abstract preset-led.
- Manager host-vs-player participation must be first-class and authoritative.
- Analytics/stat semantics must be corrected across modes.

Principle:

- Web can simplify inputs.
- Backend remains source of truth for validation, invariants, and gameplay/analytics semantics.

## 4. Organisation model implications

Status: Confirmed implications

The new flow assumes organisations are persistent canonical entities.

- Managers may belong to or manage one or more organisations.
- Session creation should prioritize selecting existing orgs over retyping names.
- Org context is foundational for:
- Reporting grouping
- Analytics grouping
- Plan/entitlement enforcement
- Session history
- Dashboard views

App/backend requirements:

- Backend remains canonical source for org ownership and membership.
- App/backend should support org-bound session workflows end-to-end.
- Prevent duplicate org fragmentation from free-text variants.
- Required read/write support should include:
- List organisations for current manager
- Sort organisations by recent use
- Safe inline org creation
- Retrieve recent sessions/session labels by org

## 5. Session naming / reuse implications

Status: Confirmed implications

- Session names are human-facing labels for reporting and repeat operations.
- Recent session labels should be suggested within selected organisation context.
- Session IDs/game codes remain system identifiers, not primary naming UX.

App/backend requirements:

- Provide backend query/read-model for recent session names by org.
- Treat reuse as “create new session with reused naming pattern,” not “edit old session.”
- Future extensibility path can include:
- Duplicate setup workflows
- Saved presets/templates
- Reusable program/session structures

## 6. Mode-led business session model

Status: Confirmed

Step 2 contract is mode-led:

- Guilds: Team-based play highlighting collaboration, coordination, and group dynamics.
- Classic: Individual play highlighting confidence, initiative, and communication performance.
- Elimination: Strategic play highlighting adaptability, resilience, and decision-making under pressure.

Communication rule:

- Explain business relevance of each mode.
- Avoid over-promising fixed analytics outputs by mode.
- Guidance line used in product language: different modes surface different behaviours and insights.

App/backend requirements:

- Canonical gameplay modes remain source of truth.
- Web mode choices map to real backend-supported modes.
- Mapping should stay direct where possible.
- Gameplay and analytics pipelines must respect true mode semantics.

## 7. Session length implications

Status: Confirmed

- Session length options: 30 / 60 / 90 minutes.
- Directly maps to `durationMinutes`.

App/backend requirements:

- Preserve compatibility with existing `durationMinutes` contracts.
- Allow future mode-specific defaults/validation without changing default UX complexity.

## 8. Manager participation architecture

Status: Confirmed feature, partially implemented in web/backend create path

Canonical field:

- `managerParticipation`: `host_only | host_player`

### Product behavior

`host_only`:

- Manager oversees session.
- Manager is not a player.
- Manager receives no contracts/targets/kill words.
- Manager should not appear in player analytics.
- Manager keeps host/admin oversight and analytics access.

`host_player`:

- Manager is a normal player.
- Manager participates in gameplay.
- Manager appears in player analytics like other participants.

### Backend responsibilities

- Persist `managerParticipation` at session/game creation.
- Enforce behavior in authoritative join/player creation paths.
- Ensure host-only manager is excluded from:
- Participant set
- Assignments/contracts/targets
- Guild allocation
- Alive count
- Claims/gameplay loops
- Leaderboards/player metrics
- Ensure host-player manager follows standard player path and identity consistency.
- Preserve authoritative transaction and invariant safety.

### App responsibilities

- Remove assumption that creator/manager is always a player.
- `host_only` must bypass player-specific contract/lobby/gameplay flows.
- `host_player` should behave like existing normal participant path.
- Audit screens/routes for role-specific behavior split.

### Implementation directive: role-based UI separation for business sessions

Status: Required implementation update for app/backend

Goal:

- Ensure `host_only` users do not see player gameplay UI and instead see a host dashboard with live session data.

Role determination:

- `host_only` => manager is not a player.
- `host_player` => manager is a player.

Routing:

- If `host_only`:
- Route to `HostDashboard` screen.
- Do not route to Contract/Vault/player screens.
- If `host_player`:
- Use existing player flow (Contract/Vault).

Remove player UI for `host_only`:

- Hide contract screen.
- Hide vault screen.
- Hide kill/claim actions.
- Hide target/kill word UI.

`HostDashboard` screen requirements:

- Game overview section:
- mode
- timer
- player count
- Player list section:
- name
- alive/caught/locked status
- points
- guild (if applicable)
- Live timeline section:
- recent events (claims, confirmations, disputes)

Data sources:

- `players` collection.
- game document.
- timeline events (existing callable or subscription).

Invariants:

- `host_only` user is not included in player list.
- `host_only` user is not counted in `aliveCount`.
- `host_only` user has no player record.

Optional:

- Add basic host controls (for example: end game).

Acceptance criteria:

- `host_only` users never see Contract or gameplay UI.
- Host dashboard reflects live game state.
- Player users experience no regression.
- `host_player` behaves exactly like a normal player.

### Web responsibilities

- Success and next-step UX should route host-only users to oversight/admin surfaces, not player join instructions.
- Host-player success state may include explicit join CTA.

### Product follow-up

- Host-only should have strong web oversight path.
- Expanded host-only controls can be evolved later.

## 9. Cross-mode stats / analytics semantics correction

Status: Confirmed problem statement and required correction direction

Problem observed:

- Death/caught semantics are inconsistent across modes.
- Elimination removals tend to count as deaths.
- Classic successful outcomes against a player do not consistently contribute.
- This can yield misleading lifetime/profile values like deaths=0 despite confirmed classic defeats.

Required canonical correction:

- “Deaths” in lifetime/business analytics should represent successful authoritative caught/defeated outcomes regardless of mode.
- Do not use only alive=false/removal semantics as analytics source.
- Separate:
- Gameplay elimination/removal semantics
- Analytics defeated/caught semantics

Desired rule:

- Elimination: confirmed success => caught/defeated + eliminated.
- Classic: confirmed success => caught/defeated only.
- Guilds: confirmed victim outcomes should contribute to caught/defeated where appropriate.

Required backend/app analytics work:

- Audit authoritative claim confirmation paths.
- Audit analytics event emission.
- Audit `playerAnalytics` materialization logic.
- Audit org-level aggregation logic.
- Audit lifetime/profile rollups.
- Audit rebuild/backfill paths.
- Remove elimination-only dependency for death/caught analytics.

Naming note:

- Consider moving internal canonical metric terminology toward mode-neutral naming:
- `caught`
- `defeated`
- `timesCaught`
- `defeatsTaken`
- UI labels can remain mode/game-surface appropriate where needed.

## 10. Backend responsibilities backlog

Status: Backend follow-up backlog

### A. Company session creation contract

- Confirm/standardize canonical fields:
- `orgId`
- `sessionName` or equivalent label field
- `mode`
- `durationMinutes`
- `managerParticipation`

### B. Organisation/session lookup support

- List organisations for current manager.
- Return recent session labels by org.
- Support recent-use ordering.

### C. Manager participation enforcement

- Enforce host-only vs host-player in authoritative player/join creation paths.
- Preserve game invariants and transaction safety.

### D. Analytics semantics correction

- Unify caught/death semantics across modes.
- Update materializers, aggregates, summaries, exports.

### E. Historical rebuild/backfill

- Backfill historical completed sessions where practical so classic caught outcomes are included correctly.

### F. Security/access

- Preserve manager oversight/analytics access even when manager is not a player.

## 11. App responsibilities backlog

Status: App follow-up backlog

### A. Host-only vs host-player behavior

- Remove creator/manager-as-player assumptions.
- `host_only` must not route to player contract/lobby/gameplay.
- `host_player` continues normal player behavior.

### B. Join/create flow audit

- Audit player creation assumptions.
- Audit rejoin assumptions.
- Audit lobby assumptions.

### C. Game-state compatibility

- Ensure host-only manager does not affect:
- `aliveCount`
- Target assignment
- Guild assignment
- Leaderboard participants
- Claim behavior

### D. Future host/admin app surfaces

- Keep as deferred unless mobile host oversight becomes explicit requirement.

### E. Stats presentation

- After backend semantic fix, align app UI to display corrected cross-mode caught/death values.

## 12. Web responsibilities summary

Status: Web summary (cross-layer context)

- Maintain Business page and navigation entry.
- Maintain server-enforced members access checks via session cookie (`__session`) and `/api/auth/session` sync.
- Maintain guided Business session creation flow (`/business/sessions/new`).
- Add org selector + recent session labels (confirmed direction, follow-up work).
- Maintain mode info panel.
- Maintain manager role selector.
- Maintain QR-based success state.
- Keep host-only post-create path focused on oversight/admin surfaces.

## 13. Invariants and non-negotiables

Status: Non-negotiable constraints

- Backend remains authoritative.
- Web simplification must not weaken backend validation.
- Host-only manager must not leak into participant datasets.
- `aliveCount`, assignment, and gameplay invariants must remain correct.
- Analytics semantics should be mode-agnostic where intended.
- Do not patch stats only in frontend presentation.
- Fix metrics at event, aggregation, and source-of-truth layers.
- Avoid raw session IDs as primary business UX labels.
- Do not expand to broad advanced settings yet.

## 14. Deferred / explicitly not in scope right now

Status: Deferred

- Billing/Stripe work
- Broad advanced settings system
- Templates as core surfaced workflow
- Branding controls in default create flow
- Raw timing controls in default create flow
- Finalized mode-specific analytics promises
- Enterprise governance/SSO/SCIM
- Heavy report polish beyond current architecture
- Broad mobile manager analytics product surfaces unless explicitly chosen later

## 15. Open questions / decisions to revisit later

Status: Open

- Should recent session labels evolve into reusable presets/templates?
- Should host-only oversight be web-only, or web + app?
- Should user-facing “Deaths” remain, or shift to “Caught/Defeats” in some surfaces?
- How should guild-mode caught/defeat semantics be represented in business reporting?
- Should mode-specific analytics descriptions become more explicit after reporting stabilizes?
- What backend read-model best powers recent session labels by organisation?
- Should `host_player` support auto-join, or always explicit join?

## 16. Recommended implementation order when app/backend work resumes

Status: Recommended sequence

1. Backend review of current company-session create contract.
2. Backend addition/confirmation of canonical `managerParticipation` support.
3. Backend enforcement for `host_only` vs `host_player` in authoritative player/join paths.
4. Backend analytics semantics audit and correction for cross-mode caught/death behavior.
5. Backend rebuild/backfill strategy for historical analytics where feasible.
6. App audit for creator/manager-as-player assumptions.
7. App routing/lobby/gameplay fixes for host-only manager behavior.
8. App stat presentation alignment after backend semantic correction lands.
9. Optional later: host oversight capability expansion.
