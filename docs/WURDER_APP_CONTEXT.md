# Wurder App Context for Web Repo

Last updated: March 7, 2026  
Source repo: `c:\dev\wurder-v1-clean`

Use this file as the baseline context when building `wurder web` so web decisions stay aligned with the live app.

## 1. Product Purpose

Wurder is a fast social assassin game. The web surface must do three things:

1. Acquire and orient invited/new players quickly.
2. Build trust (fair rules, clear support, legal pages).
3. Hand users smoothly into app join flow with minimal friction.

## 2. Canonical Terms (Use These Words)

- `game code`: 6-char uppercase alphanumeric code.
- `host`, `player`, `lobby`, `live`, `ended`.
- `kill claim`, `dispute`, `confirm`, `deny`.
- `contract`, `kill word`, `target`.
- `guild` (guild mode), `points` (classic/guild scoring contexts).

Avoid inventing alternate labels for these concepts on web.

## 3. Brand + Design Translation Requirements

### Visual Mood

- Dark, cinematic, high-contrast base.
- Glass overlays and subtle bloom lighting.
- Premium but tense game atmosphere (not playful/cartoon).

### Core Color/Surface Language

Authoritative tokens live in `src/ui/tokens.ts` and `src/ui/GlobalAppBackground.tsx`.

Key palette:

- Base gradient: `#07080D -> #120A12 -> #1E0C16 -> #2A101C`
- Crimson bloom accent: `#C7355D`, `#8E1F45`
- Ember bloom accent: `#D96A5A`
- Text on dark:
  - primary `#fff`
  - soft `rgba(255,255,255,0.86)`
  - muted `rgba(255,255,255,0.76)`
- Glass treatment:
  - fill `rgba(255,255,255,0.025)`
  - border `rgba(255,255,255,0.12)`
  - modal surfaces `rgba(8, 11, 19, alpha)`

### Typography + Shape

- App currently uses `System` family with strong weight hierarchy.
- Rounded corners are frequent (`10/12/16` and pill radii).
- Dense but readable spacing scale from `src/ui/tokens.ts`.

### Web Translation Rule

Web does not need pixel-perfect parity, but should preserve:

1. Dark atmospheric gradient background.
2. Glass card/sheet layering.
3. Clear contrast and strong readable type.
4. Same CTA/action semantics and vocabulary.

## 4. Deep Link Contract (Critical)

Canonical helpers: `src/linking/joinLink.ts`

- Deep link: `wurder://join/{GAME_CODE}`
- Universal link: `https://wurder.app/join/{GAME_CODE}`
- Valid code format: `^[A-Z0-9]{6}$`

Associated domain config in app:

- iOS associated domains: `applinks:wurder.app`
- Android intent filter: `https://wurder.app/join...`

Also ensure web host serves:

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

## 5. QR -> Web -> App Handoff Contract

### Current App Behavior

- QR scan resolves payload via `extractGameCodeFromPayload`.
- App accepts:
  - raw code (`ABC123`)
  - join paths/links containing `/join/{code}`
- Scan routes pass params to entry route:
  - `scannedCode`
  - `openPlay=1`
  - `autoJoin=1`
  - `skipResume=1`

### Required Web Behavior

When web displays a QR for joining, encode the universal join URL:

- `https://wurder.app/join/{GAME_CODE}`

Join route behavior on web should be:

1. Validate code format immediately.
2. Attempt app open (universal/app link strategy).
3. Provide browser fallback (`continue in web` or manual code).
4. Preserve code context through auth/install boundaries.

### Acceptance Criteria for Smooth Handoff

1. Scanning a web QR with phone camera lands in app join context for valid installs.
2. If app not installed, user lands on working fallback and can still continue.
3. No dead-end state without visible instruction/action.
4. Code context is never lost.

## 6. Entry/Join Route Context in App

Relevant routes:

- `app/index.tsx` (entry flow)
- `app/join/[gameCode].tsx` (join bridge)
- `app/scan-qr.tsx`, `app/scan-qr.web.tsx`

Behavior notes:

- `app/join/[gameCode].tsx` normalizes and forwards code into entry route params.
- Entry route can auto-open play modal and auto-join based on params.
- Session resume can be bypassed via `skipResume=1` for invite/QR journeys.

## 7. Current Game State Model (Web Must Reflect)

Canonical spec: `docs/GAME_STATE_MACHINE.md`

### Lifecycle

- `LOBBY -> LIVE -> ENDED`
- Reset returns `ENDED -> LOBBY`

### Modes

- `elimination`
- `classic`
- `guilds`

### Kill Claim Workflow

- `CLAIMED -> DISPUTED -> (CONFIRMED or DENIED)`
- Or `CLAIMED -> CONFIRMED`
- Claim expiry window is 10 minutes (auto-deny path exists).

### Important Invariants

- Only claim resolution can kill a player (`alive=false`).
- `aliveCount` is operationally mandatory and must match real alive players.
- Locking (`lockState`, `activeClaimId`) must align with non-terminal claim state.
- Contract/assignment invariants differ by mode and must not be oversimplified in web copy.

Web copy/UI should never imply a rule that contradicts this document.

## 8. Trust + Support Expectations

Support path in app currently points to:

- `hello@wurder.app`

Web should keep this consistent and expose it clearly in footer/legal/support pages.

## 9. Web Build Priorities (Context-Carry Summary)

For the web repo, prioritize this order:

1. Reliable join handoff (`/join/{code}` + QR compatibility).
2. Design language consistency with app atmosphere/tokens.
3. Trust surface (privacy, terms, support, fair-play language).
4. Funnel instrumentation for handoff conversion and drop-off.

## 10. Canonical Source Files to Keep Synced

- `docs/GAME_STATE_MACHINE.md`
- `docs/app-flow.md`
- `src/linking/joinLink.ts`
- `src/ui/tokens.ts`
- `src/ui/GlobalAppBackground.tsx`
- `app.json` (linking/associated domains)

If these change in app repo, refresh this context file in web repo.
