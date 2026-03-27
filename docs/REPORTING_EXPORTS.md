# Business Reporting and Exports (Phase 9.2)

## Scope

Business session exports are generated from aggregated analytics only.

- Source: `gameAnalytics/{gameCode}`
- No raw event-level export in this phase.

## Endpoints

- `GET /api/manager/games/[gameCode]/export?format=csv`
- `GET /api/manager/games/[gameCode]/export?format=pdf`

`format=pdf` currently returns a PDF-ready HTML attachment for first-pass reporting.

## Access + Tier Rules

- Must pass manager ownership check for the game.
- Must have `exports` entitlement (`enterprise` tier).
- Returns clear errors for unauthenticated, forbidden, missing analytics, and feature-locked states.

## CSV Output Sections

- Branding (if org branding exists)
- Session metrics
- Session summary fields
- Insight rows
- Player performance table

## PDF-Ready HTML Output

Includes:

- company/session name
- game code
- date
- top performer
- coaching/risk indicator
- key insight metrics
- team comparison (if present)
- player performance table
- branding (logo/accent/theme) when available

## UI Integration

Business session dashboard (canonical `/business/sessions/[gameCode]`, legacy `/manager/[gameCode]`) provides:

- `Export CSV`
- `Export PDF-ready`

Buttons are gated by entitlement and show concise locked-state messaging otherwise.

