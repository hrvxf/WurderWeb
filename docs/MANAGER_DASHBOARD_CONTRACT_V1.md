# Manager Dashboard Contract V1

## Purpose

Define the canonical web contract for manager dashboard analytics payloads and lock metric semantics before UI redesign or shared-package extraction.

- Schema id: `manager_dashboard.v1`
- Primary producer: `GET /api/manager/games/[gameCode]/dashboard`
- Reused by exports: `GET /api/manager/games/[gameCode]/export?format=csv|pdf`

## Canonical Payload

```ts
type ManagerDashboardPayload = {
  schemaVersion: "manager_dashboard.v1";
  overview: ManagerDashboardOverview;
  insights: ManagerDashboardInsight[];
  playerPerformance: ManagerPlayerPerformance[];
  sessionSummary: ManagerSessionSummary;
  recommendations: ManagerRecommendation[];
  updatedAt: string | null; // ISO-8601 UTC
  timeline?: ManagerTimelineEvent[];
};
```

## Overview

```ts
type ManagerDashboardOverview = {
  gameCode: string;
  gameName: string;
  lifecycleStatus: "not_started" | "in_progress" | "completed";
  mode: string | null;
  startedAt: string | null; // ISO-8601 UTC
  endedAt: string | null; // ISO-8601 UTC
  totalPlayers: number;
  activePlayers: number;
  totalSessions: number;
  totalEvents: number;
  metricSemantics: {
    accuracy: { unit: "ratio_0_to_1"; basis: "confirmed_claims_over_submitted_claims" };
    disputeRate: { unit: "ratio_0_to_1"; basis: "denied_claims_over_submitted_claims" };
    kd: { unit: "ratio"; basis: "kills_over_deaths" };
    deaths: {
      unit: "count";
      modeBasis:
        | "confirmed_claims_against_player"
        | "elimination_deaths"
        | "fallback_death_events";
    };
  };
};
```

## Player Performance

```ts
type ManagerPlayerPerformance = {
  playerId: string;
  displayName: string;
  kills: number | null;
  deaths: number | null;
  deathsBasis:
    | "confirmed_claims_against_player"
    | "elimination_deaths"
    | "fallback_death_events";
  kdRatio: number | null; // ratio
  claimsSubmitted: number | null;
  claimsConfirmed: number | null;
  claimsDenied: number | null;
  accuracyRatio: number | null; // 0..1
  disputeRateRatio: number | null; // 0..1
  sessionCount: number | null;
};
```

## Insights

```ts
type ManagerDashboardInsight = {
  id: string; // stable identifier, e.g. "dispute_rate"
  label: string;
  value: number | null;
  unit: "count" | "ratio" | "ms";
  severity: "info" | "warning" | "critical";
  message: string;
  evidence?: Array<{
    metric: string;
    actual: number;
    expected: number;
    comparator: "<" | "<=" | ">" | ">=" | "=";
  }>;
};
```

## Session Summary

```ts
type ManagerSessionSummary = {
  totalSessions: number;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  avgSessionDurationMs: number | null;
  longestSessionDurationMs: number | null;
  lastSessionAt: string | null;
  totalKills: number;
  totalDeaths: number;
  totalClaimsSubmitted: number;
  totalClaimsDenied: number;
  topPerformer: SummaryPlayerHighlight | null;
  coachingRisk: SummaryPlayerHighlight | null;
  teamMode: boolean;
  teamComparison: Array<{ label: string; value: number }>;
};
```

## Recommendations

```ts
type ManagerRecommendation = {
  id: string;
  category: "risk" | "performance" | "operations";
  priority: "low" | "medium" | "high";
  title: string;
  reason: string;
  action: string;
  basedOn: string[];
};
```

## Timeline (Optional)

```ts
type ManagerTimelineEvent = {
  id: string;
  occurredAt: string | null;
  type: string;
  label: string;
  actorId?: string | null;
  actorName?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};
```

## Metric Semantics

1. `kills`: confirmed successful claims (fallback to legacy kills fields if needed).
2. `deaths`: mode-dependent and explicit via `deathsBasis`.
3. `kdRatio`: `kills / deaths` with safe divide.
4. `accuracyRatio`: `claimsConfirmed / claimsSubmitted` (0..1).
5. `disputeRateRatio`: `claimsDenied / claimsSubmitted` (0..1).
6. `durationMs`: computed from session start/end timestamps in milliseconds.

Rules:

- API payload stores raw numerics and ratios, not formatted percentages.
- UI is responsible for display formatting (`ratio -> percent`).
- Units must be explicit through field names (`*Ratio`, `*Ms`) and/or insight `unit`.

## Logic Boundaries

- Domain layer (`src/domain/manager-dashboard/*`) owns:
  - types
  - metric computation
  - payload building
  - recommendations
  - timeline shaping
- API routes own:
  - auth/access checks
  - Firestore reads
  - passing source rows into domain builder
- UI components own:
  - rendering and formatting only
  - no analytics recomputation

## Conformance References

- Payload builder: `src/domain/manager-dashboard/payload.ts`
- Client coercion: `src/domain/manager-dashboard/client.ts`
- Dashboard route: `src/app/api/manager/games/[gameCode]/dashboard/route.ts`
- Export route: `src/app/api/manager/games/[gameCode]/export/route.ts`
- Contract tests:
  - `src/domain/manager-dashboard/payload.test.ts`
  - `src/domain/manager-dashboard/payload.edge.test.ts`
  - `src/domain/manager-dashboard/client.test.ts`

## Deprecation Map (Legacy -> V1)

| Legacy field/path | V1 replacement | Notes |
|---|---|---|
| `overview.status` | `overview.lifecycleStatus` | Enum normalized to `not_started \| in_progress \| completed`. |
| `playerPerformance[].accuracyPct` | `playerPerformance[].accuracyRatio` | Unit changed from percent-like values to ratio `0..1`. UI formats to `%`. |
| `insights[].value` for rate rows (percent) | `insights[].value` + `insights[].unit="ratio"` | Rate values are now stored as ratio; no API-side percent formatting. |
| `insights[].triggeredBy` | `insights[].evidence` | Same purpose, renamed and standardized. |
| `sessionSummary.avgSessionLengthSeconds` | `sessionSummary.avgSessionDurationMs` | Unit changed seconds -> milliseconds. |
| `sessionSummary.longestSessionSeconds` | `sessionSummary.longestSessionDurationMs` | Unit changed seconds -> milliseconds. |
| UI-generated recommendations (`ManagerRecommendations.tsx`) | `recommendations[]` from API payload | Recommendation logic moved to domain/API layer. |
| UI-derived top performer/coaching risk | `sessionSummary.topPerformer` / `sessionSummary.coachingRisk` | Domain computes once; UI presents only. |
| Route-local duplicated rollups (dashboard/export) | shared `buildManagerDashboardPayload(...)` | Single source of truth in domain module. |

Migration guidance:

1. Treat all `*Ratio` fields as raw ratios and format at render time.
2. Treat all `*Ms` fields as milliseconds; convert only in UI labels.
3. Avoid deriving semantics from labels; use typed fields (`unit`, `deathsBasis`, `metricSemantics`).
