# Canonical Defeated/Caught Metric

## Canonical analytics definition

- Internal canonical concept: `defeated` (also described as `caught`).
- Definition: a player is counted once whenever the game-authoritative claim outcome confirms a successful claim against that player.
- This is mode-agnostic and must apply to `classic`, `elimination`, `elimination_multi`, and `guilds`.

## Separation of semantics

- Gameplay-state semantic: elimination/removal (`alive=false`, removed from play) remains mode-specific.
- Analytics semantic: defeated/caught count is mode-agnostic.
- Do not derive defeated/caught exclusively from `alive === false`.

## Field compatibility in this web repo

Consumers resolve defeated/caught counts with this precedence:

1. `defeats`
2. `caught`
3. `timesCaught`
4. `timesDefeated`
5. `successfulClaimsAgainst`
6. `deaths` (legacy fallback)

Profile lifetime precedence:

1. `lifetimeDefeats`
2. `lifetimeCaught`
3. `lifetimeCaughtCount`
4. `lifetimeSuccessfulClaimsAgainst`
5. `lifetimeDeaths` (legacy fallback)
6. `deaths` (legacy fallback)

## Backfill

- Script: `scripts/backfill-profile-defeats-from-game-analytics.js`
- Purpose: rebuild `profiles/{uid}` lifetime defeated/caught totals from historical `gameAnalytics` player rows.
- Writes:
  - `lifetimeDefeats`
  - `lifetimeCaught`
  - `lifetimeDeaths` (legacy compatibility mirror)
