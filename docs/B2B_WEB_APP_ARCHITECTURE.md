# Wurder B2C / B2B Architecture

Last updated: March 27, 2026

## Overview

Wurder operates as one shared gameplay platform with two clearly separated product journeys:

- B2C / Personal: consumer-facing social play.
- B2B / Business: business-facing session creation, management, and analytics.

The architecture is intentionally split at the surface, API, and orchestration layers, while remaining unified at the core gameplay and user identity layers.

This allows Wurder to:

- preserve one canonical gameplay model
- preserve persistent user data across personal and business play
- keep user experience, route structure, and service boundaries clean
- let the app behave differently by session type without forking the game engine

## 1) Architectural Principle

### Shared core, separate products

System rule:

- B2C and B2B are separate products at the platform boundary.
- B2C and B2B are not separate engines underneath.

Shared across both:

- canonical game model
- join-code system
- core gameplay rules
- player/account identity
- persistent player history
- app join flow
- shared low-level persistence primitives

Separated across both:

- website journeys
- route trees
- navigation
- creation APIs
- orchestration services
- entitlement and org logic
- business dashboards and reporting
- session framing and language

## 2) Web Architecture

### Purpose of web layer

The website presents two distinct entry journeys under one brand:

- Personal workspace
- Business workspace

The strongest visible separation is in web IA, routing, and navigation.

### 2.1 Personal (B2C) web architecture

Responsibility:

- joining a game
- creating a personal host game
- consumer-friendly social product entry

Canonical route space:

- `/join`
- `/join/[gameCode]`

Behavior:

- `/join` is strictly Personal.
- It contains join-by-code and personal host/create only.
- It does not contain Business creation UI.
- Business may exist as a top-level nav destination, not mixed inside Personal flow.

UX intent:

- lighter
- faster
- game-forward
- simpler to enter

### 2.2 Business (B2B) web architecture

Responsibility:

- business discovery
- session creation
- organisation-level management
- manager reporting and analytics
- session-level analysis

Canonical route space:

- `/business`
- `/business/dashboard`
- `/business/sessions/new`
- `/business/sessions/[gameCode]`
- `/business/sessions/[gameCode]/compare`
- `/business/sessions/[gameCode]/players/[playerId]`
- `/business/orgs/[orgId]`

Behavior:

- Business journey is self-contained under `/business/...`.
- It handles Business session creation, dashboards, session analytics, player drilldown, and organisation views.

UX intent:

- structured
- professional
- tool-oriented
- less overtly consumer-game-like
- still recognisably Wurder

### 2.3 Web separation model

Separation is enforced at:

- route level
- navigation level
- creation form level
- dashboard level
- link generation level
- post-create success-state level

Result:

- Personal users remain in Personal route tree.
- Business users remain in Business route tree.
- `/admin` and `/manager` are no longer primary product journeys.

### 2.4 Legacy route handling

Legacy paths should exist only as:

- redirects
- compatibility shims
- temporary transition helpers

Examples no longer canonical as product IA:

- `/admin/...`
- `/manager/...`

Legacy telemetry window:

- compatibility wrappers log first-hit usage via legacy-surface telemetry and set an `x-legacy-surface` response header.
- current telemetry sunset target: June 30, 2026.
- zero-traffic legacy wrappers should be removed after the telemetry window.

## 3) Backend Architecture

### Purpose of backend layer

Backend responsibilities:

- enforce Personal vs Business boundary at service/API level
- create canonical game/session records
- apply Business-only side effects
- resolve org access and entitlement
- preserve one shared gameplay model underneath

### 3.1 Shared canonical gameplay model

Both B2C and B2B resolve to the same core:

- one canonical game/session record
- one canonical join code
- one shared player model
- one shared gameplay engine

Business is a product wrapper around shared gameplay, not a separate engine.

### 3.2 Canonical session discriminator

Canonical field:

```ts
gameType: "b2c" | "b2b";
```

Meaning:

- `gameType = "b2c"` -> Personal game
- `gameType = "b2b"` -> Business session

Why this matters:

- app-aware session framing
- analytics filtering
- business-specific UI treatment
- clean orchestration branching
- reporting by session type

### 3.3 Backend API separation

Public API boundary is split into two domains:

- B2C API: Personal creation endpoint(s).
- B2B API: Business creation endpoint(s).

Rules:

- Personal does not hit Business-named create endpoints.
- Business does not rely on admin-named endpoints as canonical product boundary.
- request contracts are separated by product domain.

### 3.4 Backend orchestration separation

Top-level orchestration is split into product services:

Personal orchestration:

- Personal validation
- Personal defaults
- canonical game creation for B2C

Business orchestration:

- org resolution
- org provisioning where required
- entitlement checks
- template/session rules
- branding/session metadata
- analytics-related setup
- org linkage
- canonical game creation for B2B

Shared primitive beneath both:

- base game record persistence
- code generation
- shared defaults
- timestamps and canonical record setup

The shared primitive must stay product-agnostic.

### 3.5 Business-only backend side effects

Business creation includes orchestration beyond base game creation:

- org provisioning
- org branding updates
- template creation/retrieval
- template entitlement checks
- org-session linkage
- manager/session metadata attachment
- analytics-enabling metadata

These concerns are isolated to Business orchestration.

### 3.6 Entitlement architecture

Business access is centrally controlled via server-side entitlement logic.

Entitlements determine:

- business access allow/deny
- role level
- tier
- enabled features
- access to dashboard, session creation, templates, org views, reporting

Safety rule:

- missing tier must not imply enterprise
- unknown tier must not imply enterprise
- new orgs must not default to enterprise unless explicitly provisioned

### 3.7 Unified identity and persistence

Personal and Business are separate products but share one identity model:

- same user account can participate in both
- both can contribute to persistent history
- account data can be segmented by `gameType`
- analytics can support all-time, personal-only, and business-only totals

## 4) App Architecture

### Purpose of app layer

The app is the shared runtime where sessions are played. It does not maintain two engines.

App responsibilities:

- join a session by code
- resolve canonical game/session data
- detect Personal vs Business session type
- present contextual framing
- preserve one core gameplay flow

### 4.1 Shared app join model

Join behavior remains shared:

- user joins via code/join flow
- app resolves canonical game record
- app reads session metadata
- app enters gameplay flow

### 4.2 App awareness of session type

App reads `gameType` from canonical game record and stores it in session state.

This enables:

- Personal vs Business framing
- onboarding copy differences
- lobby wording differences
- manager-related labels
- analytics-aware UI differences
- future Business overlays/features

Constraint:

- gameplay logic remains shared
- context-aware framing must not become gameplay-engine forks

### 4.3 Personal app behavior

For Personal sessions:

- consumer/social framing
- Personal terminology
- no Business-only controls/language

### 4.4 Business app behavior

For Business sessions:

- Business session framing
- business-aware wording
- more structured/tool-oriented context where needed

Key rule:

- same gameplay engine
- different session context

### 4.5 Why app runtime is not split

Benefits:

- one join flow
- one player identity
- one canonical rules engine
- less duplication
- lower maintenance
- better analytics consistency
- easier shared feature development

Trade-off:

- strict discipline needed around `gameType` presentation branching
- stronger separation pushed to web/backend boundaries

## 5) Cross-Layer Relationship

Web defines product journey:

- Personal and Business separated by route tree, UI, and navigation

Backend defines domain boundary:

- Personal and Business separated by APIs, orchestration, entitlement, and side effects

App defines runtime session experience:

- shared gameplay runtime with session-type awareness

### End-to-end Personal flow

1. User enters Personal web journey.
2. Personal web creates a Personal game.
3. Backend writes canonical game with `gameType = "b2c"`.
4. User joins via shared join flow.
5. App resolves game.
6. App reads `gameType = "b2c"`.
7. App presents Personal framing.

### End-to-end Business flow

1. User enters Business web journey.
2. Business web creates a Business session.
3. Backend performs Business orchestration.
4. Backend writes canonical game with `gameType = "b2b"`.
5. Business metadata and org linkage are attached.
6. User joins via shared join flow.
7. App resolves game.
8. App reads `gameType = "b2b"`.
9. App presents Business framing.
10. Dashboards/reporting remain in Business web workspace.

## 6) Why this architecture

Problem solved:

- keep B2C and B2B separate enough to stay clean
- keep them unified enough to preserve one product core

Full split would cause:

- duplicated gameplay logic
- duplicated join systems
- fragmented user history
- higher maintenance overhead

Shallow split would cause:

- confusing UI
- leaky APIs
- overloaded services
- unclear business boundaries
- growing architectural debt

Chosen model:

- hard separation at the edge
- shared core underneath

## 7) Summary

Personal / B2C:

- consumer-facing
- Personal web routes
- simpler creation flow
- lighter UX
- canonical games with `gameType = "b2c"`

Business / B2B:

- business-facing
- Business web routes
- structured creation/reporting flow
- entitlement-aware
- org-aware
- analytics-aware
- canonical sessions with `gameType = "b2b"`

Shared core:

- same gameplay engine
- same join model
- same user identity
- same persistent history model
- same app runtime client
- same canonical game model, distinguished by `gameType`

## Final positioning statement

Wurder uses a dual-surface architecture: Personal and Business are separated at web, API, and service boundaries, while remaining unified through one canonical gameplay and identity core. This supports both social play and business communication analysis without fragmenting the product or duplicating the engine.
