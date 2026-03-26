import {
  asBoolean,
  asNumber,
  asString,
  computeAccuracyRatio,
  computeDisputeRateRatio,
  computeDurationMs,
  computeKd,
  eventLabel,
  normalizeMaybePercentRatio,
  normalizeMode,
  pickFirstNumber,
  resolveDeathsBasis,
  safeDivide,
  toIso,
} from "@/domain/manager-dashboard/metrics";
import { buildRecommendations } from "@/domain/manager-dashboard/recommendations";
import { shapeTimelineEvents } from "@/domain/manager-dashboard/timeline";
import type {
  BuildPayloadInput,
  DeathsBasis,
  ManagerDashboardInsight,
  ManagerKpiThresholds,
  ManagerDashboardPayload,
  ManagerPlayerPerformance,
  ManagerSessionSummary,
  TeamComparisonMetric,
} from "@/domain/manager-dashboard/types";

function toMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function createSummaryHighlight(player: ManagerPlayerPerformance | null) {
  if (!player) return null;
  return {
    playerId: player.playerId,
    displayName: player.displayName,
    ...(player.avatarUrl ? { avatarUrl: player.avatarUrl } : {}),
    kills: player.kills,
    deaths: player.deaths,
    kdRatio: player.kdRatio,
    accuracyRatio: player.accuracyRatio,
  };
}

function findTopPerformer(players: ManagerPlayerPerformance[]): ManagerPlayerPerformance | null {
  if (players.length === 0) return null;
  return [...players].sort((a, b) => {
    if ((b.kills ?? Number.NEGATIVE_INFINITY) !== (a.kills ?? Number.NEGATIVE_INFINITY)) {
      return (b.kills ?? Number.NEGATIVE_INFINITY) - (a.kills ?? Number.NEGATIVE_INFINITY);
    }
    if ((b.kdRatio ?? Number.NEGATIVE_INFINITY) !== (a.kdRatio ?? Number.NEGATIVE_INFINITY)) {
      return (b.kdRatio ?? Number.NEGATIVE_INFINITY) - (a.kdRatio ?? Number.NEGATIVE_INFINITY);
    }
    return (b.accuracyRatio ?? Number.NEGATIVE_INFINITY) - (a.accuracyRatio ?? Number.NEGATIVE_INFINITY);
  })[0] ?? null;
}

function findCoachingRisk(players: ManagerPlayerPerformance[]): ManagerPlayerPerformance | null {
  const active = players.filter((player) => (player.sessionCount ?? 0) > 0);
  if (active.length === 0) return null;
  return [...active].sort((a, b) => {
    if ((b.deaths ?? 0) !== (a.deaths ?? 0)) return (b.deaths ?? 0) - (a.deaths ?? 0);
    if ((a.kdRatio ?? Number.POSITIVE_INFINITY) !== (b.kdRatio ?? Number.POSITIVE_INFINITY)) {
      return (a.kdRatio ?? Number.POSITIVE_INFINITY) - (b.kdRatio ?? Number.POSITIVE_INFINITY);
    }
    return (a.accuracyRatio ?? Number.POSITIVE_INFINITY) - (b.accuracyRatio ?? Number.POSITIVE_INFINITY);
  })[0] ?? null;
}

function isTeamMode(mode: string | null, eventTotals: Map<string, number>): boolean {
  const normalized = normalizeMode(mode);
  if (normalized.includes("team") || normalized.includes("guild")) return true;
  return [...eventTotals.keys()].some((key) => key.toLowerCase().includes("team") || key.toLowerCase().includes("guild"));
}

function buildTeamComparison(eventTotals: Map<string, number>): TeamComparisonMetric[] {
  return [...eventTotals.entries()]
    .filter(([key]) => {
      const normalized = key.toLowerCase();
      return normalized.includes("team") || normalized.includes("guild");
    })
    .slice(0, 2)
    .map(([key, value]) => ({ label: eventLabel(key), value }));
}

function buildInsights(args: {
  eventTotals: Map<string, number>;
  totalClaimsSubmitted: number;
  totalClaimsDenied: number;
  totalClaimsConfirmed: number;
  thresholds: Partial<ManagerKpiThresholds> | undefined;
}): ManagerDashboardInsight[] {
  const { eventTotals, totalClaimsSubmitted, totalClaimsDenied, totalClaimsConfirmed, thresholds } = args;
  const list: ManagerDashboardInsight[] = [...eventTotals.entries()]
    .map(([eventType, value]) => ({
      id: `event_${eventType.toLowerCase()}`,
      label: eventLabel(eventType),
      value,
      unit: "count" as const,
      severity: "info" as const,
      message: `${eventLabel(eventType)} occurred ${value} times.`,
    }))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const disputeRateRatio = computeDisputeRateRatio(totalClaimsDenied, totalClaimsSubmitted);
  if (totalClaimsSubmitted > 0) {
    list.unshift({
      id: "claims_submitted",
      label: "Claims Submitted",
      value: totalClaimsSubmitted,
      unit: "count",
      severity: "info",
      message: `Players submitted ${totalClaimsSubmitted} claim(s).`,
    });
    list.unshift({
      id: "claims_denied",
      label: "Claims Denied",
      value: totalClaimsDenied,
      unit: "count",
      severity: totalClaimsDenied > 0 ? "warning" : "info",
      message:
        totalClaimsDenied > 0
          ? `${totalClaimsDenied} claim(s) were denied.`
          : "No denied claims were recorded.",
    });
    list.unshift({
      id: "claims_confirmed",
      label: "Claims Confirmed",
      value: totalClaimsConfirmed,
      unit: "count",
      severity: "info",
      message: `${totalClaimsConfirmed} claim(s) were confirmed.`,
    });
  }

  if (disputeRateRatio != null) {
    const threshold = Number.isFinite(thresholds?.disputeRateWarningRatio) ? (thresholds?.disputeRateWarningRatio ?? 0.3) : 0.3;
    const rounded = Number(disputeRateRatio.toFixed(6));
    const thresholdLabel = thresholds?.disputeRateLabel?.trim() || "expected threshold";
    const thresholdPercent = `${(threshold * 100).toFixed(1)}%`;
    list.unshift({
      id: "dispute_rate",
      label: "Dispute Rate",
      value: rounded,
      unit: "ratio",
      severity: rounded > threshold ? "warning" : "info",
      message:
        rounded > threshold
          ? `Dispute rate is above the ${thresholdLabel} (${thresholdPercent}).`
          : `Dispute rate is within the ${thresholdLabel} (${thresholdPercent}).`,
      evidence: [
        {
          metric: "dispute_rate_ratio",
          actual: rounded,
          expected: threshold,
          comparator: "<=",
        },
      ],
    });
  }

  return list;
}

export function buildManagerDashboardPayload(input: BuildPayloadInput): ManagerDashboardPayload {
  const mode = asString(input.game.mode);
  const normalizedMode = normalizeMode(mode);
  const deathsBasisForMode: DeathsBasis = resolveDeathsBasis(normalizedMode);
  const startedAt = toIso(input.game.startedAt) ?? toIso(input.game.started);
  const endedAt = toIso(input.game.endedAt) ?? toIso(input.game.ended);
  const startedFlag = asBoolean(input.game.started) ?? startedAt != null;
  const endedFlag = asBoolean(input.game.ended) ?? endedAt != null;
  const lifecycleStatus = endedFlag ? "completed" : startedFlag ? "in_progress" : "not_started";

  const eventTotals = new Map<string, number>();
  const playerPerformance: ManagerPlayerPerformance[] = input.playerAnalyticsDocs.map((doc, index) => {
    const data = doc.data;
    const eventCounts =
      data.eventCounts && typeof data.eventCounts === "object" ? (data.eventCounts as Record<string, unknown>) : {};
    for (const [eventType, rawCount] of Object.entries(eventCounts)) {
      const count = asNumber(rawCount) ?? 0;
      eventTotals.set(eventType, (eventTotals.get(eventType) ?? 0) + count);
    }

    const claimsConfirmed = pickFirstNumber(
      data.confirmedCount,
      data.convertedClaimCount,
      data.convertedCount,
      eventCounts.admin_confirm_kill_claim,
      eventCounts.kill_claim_confirmed
    );
    const claimsSubmitted = pickFirstNumber(
      data.claimCount,
      data.claimsCount,
      data.totalClaims,
      eventCounts.kill_claim,
      eventCounts.kill_claim_submitted,
      eventCounts.admin_confirm_kill_claim
    );
    const claimsDenied = pickFirstNumber(data.deniedCount, data.disputeCount, eventCounts.admin_deny_kill_claim, eventCounts.kill_claim_denied);

    const kills = pickFirstNumber(data.kills, claimsConfirmed);
    const eliminationDeaths = pickFirstNumber(
      data.eliminationDeaths,
      data.eliminationDeathCount,
      data.deaths,
      data.deathCount,
      eventCounts.elimination_death,
      eventCounts.eliminated,
      eventCounts.death
    );
    const confirmedAgainst = pickFirstNumber(
      data.confirmedAgainst,
      data.confirmedAgainstCount,
      data.claimsAgainstConfirmed,
      data.claimsConfirmedAgainst,
      eventCounts.confirmed_against,
      eventCounts.admin_confirm_kill_claim_against,
      eventCounts.kill_claim_confirmed_against,
      eventCounts.victim_confirmed_claim
    );

    const deaths =
      deathsBasisForMode === "confirmed_claims_against_player"
        ? confirmedAgainst
        : deathsBasisForMode === "elimination_deaths"
          ? eliminationDeaths
          : pickFirstNumber(eliminationDeaths, confirmedAgainst, eventCounts.death);

    const claimsFromEventCounts = asNumber(eventCounts.kill_claim);
    if (claimsSubmitted != null && claimsFromEventCounts == null) {
      eventTotals.set("kill_claim", (eventTotals.get("kill_claim") ?? 0) + claimsSubmitted);
    }
    if (claimsConfirmed != null && asNumber(eventCounts.admin_confirm_kill_claim) == null) {
      eventTotals.set("admin_confirm_kill_claim", (eventTotals.get("admin_confirm_kill_claim") ?? 0) + claimsConfirmed);
    }
    if (claimsDenied != null && asNumber(eventCounts.admin_deny_kill_claim) == null) {
      eventTotals.set("admin_deny_kill_claim", (eventTotals.get("admin_deny_kill_claim") ?? 0) + claimsDenied);
    }

    const rawAccuracy = normalizeMaybePercentRatio(data.successRate) ?? normalizeMaybePercentRatio(data.accuracy) ?? normalizeMaybePercentRatio(data.accuracyPct);
    const accuracyRatio = rawAccuracy ?? computeAccuracyRatio(claimsConfirmed, claimsSubmitted);
    const disputeRateRatio = computeDisputeRateRatio(claimsDenied, claimsSubmitted);
    const kdRatio = computeKd(kills, deaths);
    const sessionCount = pickFirstNumber(data.sessionCount, data.sessions, data.eventsTotal != null || claimsSubmitted != null ? 1 : null);
    const avatarUrl =
      asString(data.avatarUrl) ??
      asString(data.avatarURL) ??
      asString(data.photoURL) ??
      asString(data.photoUrl) ??
      asString(data.profilePhotoUrl) ??
      asString(data.imageUrl) ??
      asString(data.imageURL);

    const resolvedPlayerId = asString(data.playerId) ?? asString(data.userId) ?? doc.id ?? `row-${index}`;
    return {
      playerId: resolvedPlayerId,
      displayName:
        asString(data.displayName) ??
        asString(data.playerName) ??
        asString(data.name) ??
        asString(data.wurderId) ??
        asString(data.username) ??
        asString(data.handle) ??
        resolvedPlayerId,
      ...(avatarUrl ? { avatarUrl } : {}),
      kills,
      deaths,
      deathsBasis: deathsBasisForMode,
      kdRatio,
      claimsSubmitted,
      claimsConfirmed,
      claimsDenied,
      accuracyRatio,
      disputeRateRatio,
      sessionCount,
    };
  });

  if (playerPerformance.length === 0) {
    for (const event of input.analyticsEvents) {
      const eventType = asString(event.data.eventType) ?? asString(event.data.type);
      if (!eventType) continue;
      eventTotals.set(eventType, (eventTotals.get(eventType) ?? 0) + 1);
    }
  }

  const totalEventsFromPlayers = input.playerAnalyticsDocs.reduce((sum, doc) => sum + (asNumber(doc.data.eventsTotal) ?? 0), 0);
  const totalEventsFromCounts = [...eventTotals.values()].reduce((sum, count) => sum + count, 0);
  const totalEvents = totalEventsFromPlayers > 0 ? totalEventsFromPlayers : totalEventsFromCounts;

  const totalClaimsSubmitted = playerPerformance.reduce((sum, player) => sum + (player.claimsSubmitted ?? 0), 0);
  const totalClaimsDenied = playerPerformance.reduce((sum, player) => sum + (player.claimsDenied ?? 0), 0);
  const totalClaimsConfirmed = playerPerformance.reduce((sum, player) => sum + (player.claimsConfirmed ?? 0), 0);
  const totalKills = playerPerformance.reduce((sum, player) => sum + (player.kills ?? 0), 0);
  const totalDeaths = playerPerformance.reduce((sum, player) => sum + (player.deaths ?? 0), 0);

  const hasSessionEvidence =
    startedAt != null || endedAt != null || playerPerformance.length > 0 || input.analyticsEvents.length > 0;
  const totalSessions = hasSessionEvidence ? 1 : 0;
  const durationMs = computeDurationMs({
    startedAtMs: toMs(startedAt),
    endedAtMs: toMs(endedAt),
  });

  const topPerformer = findTopPerformer(playerPerformance);
  const coachingRisk = findCoachingRisk(playerPerformance);
  const teamMode = isTeamMode(mode, eventTotals);
  const teamComparison = buildTeamComparison(eventTotals);

  const sessionSummary: ManagerSessionSummary = {
    totalSessions,
    startedAt,
    endedAt,
    durationMs,
    avgSessionDurationMs: totalSessions > 0 ? durationMs : null,
    longestSessionDurationMs: totalSessions > 0 ? durationMs : null,
    lastSessionAt: endedAt ?? startedAt,
    totalKills,
    totalDeaths,
    totalClaimsSubmitted,
    totalClaimsDenied,
    topPerformer: createSummaryHighlight(topPerformer),
    coachingRisk: createSummaryHighlight(coachingRisk),
    teamMode,
    teamComparison,
  };

  const insights = buildInsights({
    eventTotals,
    totalClaimsSubmitted,
    totalClaimsDenied,
    totalClaimsConfirmed,
    thresholds: input.thresholds,
  });

  const recommendations = buildRecommendations({
    summary: sessionSummary,
    insights,
    players: playerPerformance,
  });

  const updatedAt = toIso(
    input.playerAnalyticsDocs
      .map((doc) => doc.data.updatedAt)
      .find((value) => value != null) ?? null
  );

  return {
    schemaVersion: "manager_dashboard.v1",
    overview: {
      gameCode: input.gameCode,
      gameName: asString(input.game.name) ?? input.gameCode,
      lifecycleStatus,
      mode,
      startedAt,
      endedAt,
      totalPlayers: playerPerformance.length,
      activePlayers: playerPerformance.length,
      totalSessions,
      totalEvents,
      metricSemantics: {
        accuracy: { unit: "ratio_0_to_1", basis: "confirmed_claims_over_submitted_claims" },
        disputeRate: { unit: "ratio_0_to_1", basis: "denied_claims_over_submitted_claims" },
        kd: { unit: "ratio", basis: "kills_over_deaths" },
        deaths: { unit: "count", modeBasis: deathsBasisForMode },
      },
    },
    insights,
    playerPerformance,
    sessionSummary,
    recommendations,
    updatedAt,
    timeline: input.includeTimeline ? shapeTimelineEvents(input.analyticsEvents) : undefined,
  };
}
