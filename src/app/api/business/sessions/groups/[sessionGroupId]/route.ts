import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";
import { parseBusinessSessionGroupId } from "@/lib/business/session-groups";
import { buildBusinessSessionsIndexReadModel } from "@/lib/business/sessions-read-model";

export const runtime = "nodejs";

type TimelinePreviewEvent = {
  id: string;
  occurredAt: string | null;
  label: string;
  type: string;
  gameCode: string;
};

type SessionPlayerAggregate = {
  playerId: string;
  displayName: string;
  avatarUrl: string | null;
  primaryGameCode: string;
  claimsAttempted: number;
  claimsConfirmed: number;
  claimsDenied: number;
  accuracyRatio: number | null;
  deaths: number;
  survivalRatio: number | null;
  disputeRateRatio: number | null;
  gamesPlayed: number;
};

type SessionHealth = {
  joinRate: number | null;
  completionRate: number | null;
  dropOffRate: number | null;
  status: "healthy" | "watch" | "at_risk" | "insufficient_data";
  indicators: string[];
};

type SessionInsight = {
  id: string;
  title: string;
  summary: string;
  severity: "info" | "warning" | "critical";
};

type SessionAlert = {
  id: string;
  title: string;
  message: string;
  level: "warning" | "critical";
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asTimelineEvents(value: unknown, gameCode: string): TimelinePreviewEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      return {
        id: asNonEmptyString(row.id) ?? `${gameCode}-event-${index}`,
        occurredAt: asNonEmptyString(row.occurredAt),
        label: asNonEmptyString(row.label) ?? "Timeline event",
        type: asNonEmptyString(row.type) ?? "event",
        gameCode,
      };
    })
    .sort((left, right) => {
      const leftMs = left.occurredAt ? new Date(left.occurredAt).getTime() : 0;
      const rightMs = right.occurredAt ? new Date(right.occurredAt).getTime() : 0;
      return rightMs - leftMs;
    });
}

async function estimateGamePlayerKeys(gameCode: string): Promise<Set<string>> {
  const [byGameCode, byGameId] = await Promise.all([
    adminDb.collection("playerAnalytics").where("gameCode", "==", gameCode).get(),
    adminDb.collection("playerAnalytics").where("gameId", "==", gameCode).get(),
  ]);
  const keys = new Set<string>();
  for (const doc of [...byGameCode.docs, ...byGameId.docs]) {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const normalized =
      asNonEmptyString(data.playerId) ??
      asNonEmptyString(data.userId) ??
      asNonEmptyString(data.displayName) ??
      doc.id;
    keys.add(normalized);
  }
  return keys;
}

function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function buildSessionInsights(input: {
  players: SessionPlayerAggregate[];
  health: SessionHealth;
}): SessionInsight[] {
  const list: SessionInsight[] = [];
  const accuracyValues = input.players
    .map((player) => player.accuracyRatio)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const avgAccuracy = average(accuracyValues);
  const disputeValues = input.players
    .map((player) => player.disputeRateRatio)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const avgDisputeRate = average(disputeValues);
  const topCloser = [...input.players]
    .sort((left, right) => right.claimsConfirmed - left.claimsConfirmed)[0];

  if (
    input.health.completionRate != null &&
    input.health.completionRate >= 0.75 &&
    avgAccuracy != null &&
    avgAccuracy < 0.55
  ) {
    list.push({
      id: "high-engagement-low-accuracy",
      title: "High Engagement, Low Accuracy",
      summary: "Participation is strong, but accuracy indicates opportunity for targeted execution coaching.",
      severity: "warning",
    });
  }

  if (avgDisputeRate != null && avgDisputeRate >= 0.3) {
    list.push({
      id: "high-disputes",
      title: "High Dispute Activity",
      summary: "Dispute rate is elevated; tighten claim validation and communication protocol.",
      severity: avgDisputeRate >= 0.45 ? "critical" : "warning",
    });
  }

  if (topCloser && topCloser.claimsConfirmed >= 5 && (topCloser.accuracyRatio ?? 0) >= 0.75) {
    list.push({
      id: "strong-closer",
      title: "Strong Closer Identified",
      summary: `${topCloser.displayName} is converting consistently and can be used as an exemplar.`,
      severity: "info",
    });
  }

  if (list.length === 0) {
    list.push({
      id: "stable-session",
      title: "No Critical Engagement Signals",
      summary: "Current session metrics are stable. Continue monitoring for trend shifts.",
      severity: "info",
    });
  }

  return list.slice(0, 4);
}

function buildSessionAlerts(input: {
  players: SessionPlayerAggregate[];
  health: SessionHealth;
}): SessionAlert[] {
  const alerts: SessionAlert[] = [];

  if (input.health.dropOffRate != null && input.health.dropOffRate > 0.4) {
    alerts.push({
      id: "dropoff-anomaly",
      title: "Drop-off Anomaly",
      message: "Drop-off exceeded 40%. Validate onboarding and facilitator pacing.",
      level: "critical",
    });
  }

  const severeDisputePlayers = input.players.filter(
    (player) => player.claimsAttempted >= 5 && (player.disputeRateRatio ?? 0) >= 0.5
  );
  if (severeDisputePlayers.length > 0) {
    alerts.push({
      id: "player-dispute-anomaly",
      title: "Player Dispute Spike",
      message: `${severeDisputePlayers.length} player(s) show severe dispute rates; review claim evidence quality.`,
      level: "warning",
    });
  }

  if (input.players.length > 0 && input.players.length <= 2) {
    alerts.push({
      id: "low-participation",
      title: "Low Participation",
      message: "Very low active staff count can distort engagement metrics and reduce confidence.",
      level: "warning",
    });
  }

  return alerts.slice(0, 4);
}

export async function GET(request: Request, { params }: { params: Promise<{ sessionGroupId: string }> }) {
  try {
    const uid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const { sessionGroupId } = await params;
    const parsed = parseBusinessSessionGroupId(sessionGroupId);
    if (!parsed) {
      return NextResponse.json({ code: "INVALID_SESSION_GROUP_ID", message: "Invalid session group identifier." }, { status: 400 });
    }

    const orgs = await buildBusinessSessionsIndexReadModel(uid);
    const orgRow = orgs.find((row) => row.org.orgId === parsed.orgId);
    const session = orgRow?.sessions.find((row) => row.sessionGroupId === sessionGroupId);
    if (!orgRow || !session) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Session group not found." }, { status: 404 });
    }

    const dashboardDocs = await Promise.all(
      session.gameCodes.map((gameCode) => adminDb.collection("managerDashboard").doc(gameCode.trim().toUpperCase()).get())
    );

    const uniquePlayers = new Set<string>();
    const timeline = new Array<TimelinePreviewEvent>();
    const gameJoiners = new Map<string, Set<string>>();
    const gameCompleters = new Map<string, Set<string>>();
    const playerRows = new Map<
      string,
      {
        playerId: string;
        displayName: string;
        avatarUrl: string | null;
        primaryGameCode: string;
        gamesPlayed: number;
        survivalGames: number;
        claimsAttempted: number;
        claimsConfirmed: number;
        claimsDenied: number;
        deaths: number;
        accuracySamples: number[];
        disputeRateSamples: number[];
      }
    >();
    let playersFromCache = 0;
    for (let index = 0; index < dashboardDocs.length; index += 1) {
      const doc = dashboardDocs[index];
      const gameCode = session.gameCodes[index] ?? "";
      if (!doc.exists) continue;
      const analytics = ((doc.data() ?? {}) as { analytics?: unknown }).analytics;
      if (!analytics || typeof analytics !== "object") continue;
      const payload = analytics as Record<string, unknown>;
      const players = Array.isArray(payload.playerPerformance) ? payload.playerPerformance : [];
      if (players.length > 0) {
        playersFromCache += players.length;
      }
      for (const row of players) {
        const player = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
        const playerId = asNonEmptyString(player.playerId) ?? asNonEmptyString(player.displayName);
        if (playerId) uniquePlayers.add(playerId);
        if (!playerId) continue;

        const gameJoinedSet = gameJoiners.get(gameCode) ?? new Set<string>();
        gameJoinedSet.add(playerId);
        gameJoiners.set(gameCode, gameJoinedSet);

        const claimsAttempted = Math.max(0, asNumber(player.claimsSubmitted) ?? 0);
        const claimsConfirmed = Math.max(0, asNumber(player.claimsConfirmed) ?? 0);
        const claimsDenied = Math.max(0, asNumber(player.claimsDenied) ?? 0);
        const deaths = Math.max(0, asNumber(player.deaths) ?? 0);
        const accuracyRatio = asNumber(player.accuracyRatio);
        const disputeRateRatio = asNumber(player.disputeRateRatio);
        const avatarUrl = asNonEmptyString(player.avatarUrl);
        const displayName = asNonEmptyString(player.displayName) ?? playerId;
        const isCompleter = claimsAttempted > 0 || claimsConfirmed > 0 || claimsDenied > 0;
        if (isCompleter) {
          const gameCompletedSet = gameCompleters.get(gameCode) ?? new Set<string>();
          gameCompletedSet.add(playerId);
          gameCompleters.set(gameCode, gameCompletedSet);
        }

        const existing = playerRows.get(playerId);
        if (!existing) {
          playerRows.set(playerId, {
            playerId,
            displayName,
            avatarUrl,
            primaryGameCode: gameCode,
            gamesPlayed: 1,
            survivalGames: deaths === 0 ? 1 : 0,
            claimsAttempted,
            claimsConfirmed,
            claimsDenied,
            deaths,
            accuracySamples: accuracyRatio != null ? [accuracyRatio] : [],
            disputeRateSamples: disputeRateRatio != null ? [disputeRateRatio] : [],
          });
          continue;
        }

        existing.displayName = existing.displayName || displayName;
        existing.avatarUrl = existing.avatarUrl ?? avatarUrl;
        existing.gamesPlayed += 1;
        existing.survivalGames += deaths === 0 ? 1 : 0;
        existing.claimsAttempted += claimsAttempted;
        existing.claimsConfirmed += claimsConfirmed;
        existing.claimsDenied += claimsDenied;
        existing.deaths += deaths;
        if (accuracyRatio != null) existing.accuracySamples.push(accuracyRatio);
        if (disputeRateRatio != null) existing.disputeRateSamples.push(disputeRateRatio);
      }
      timeline.push(...asTimelineEvents(payload.timeline, gameCode));
    }

    let playerCount = uniquePlayers.size;
    if (playerCount === 0 && playersFromCache === 0) {
      const estimatedKeys = await Promise.all(session.gameCodes.map((gameCode) => estimateGamePlayerKeys(gameCode)));
      const mergedKeys = new Set<string>();
      for (const set of estimatedKeys) {
        for (const key of set) mergedKeys.add(key);
      }
      playerCount = mergedKeys.size;
    }

    const timelinePreview = timeline
      .sort((left, right) => {
        const leftMs = left.occurredAt ? new Date(left.occurredAt).getTime() : 0;
        const rightMs = right.occurredAt ? new Date(right.occurredAt).getTime() : 0;
        return rightMs - leftMs;
      })
      .slice(0, 24);

    const players: SessionPlayerAggregate[] = [...playerRows.values()]
      .map((row) => {
        const weightedAccuracy =
          row.claimsAttempted > 0 ? row.claimsConfirmed / row.claimsAttempted : null;
        const weightedDisputeRate =
          row.claimsAttempted > 0 ? row.claimsDenied / row.claimsAttempted : null;
        const sampledAccuracy =
          row.accuracySamples.length > 0
            ? row.accuracySamples.reduce((sum, value) => sum + value, 0) / row.accuracySamples.length
            : null;
        const sampledDispute =
          row.disputeRateSamples.length > 0
            ? row.disputeRateSamples.reduce((sum, value) => sum + value, 0) / row.disputeRateSamples.length
            : null;

        return {
          playerId: row.playerId,
          displayName: row.displayName,
          avatarUrl: row.avatarUrl,
          primaryGameCode: row.primaryGameCode,
          claimsAttempted: row.claimsAttempted,
          claimsConfirmed: row.claimsConfirmed,
          claimsDenied: row.claimsDenied,
          accuracyRatio: weightedAccuracy ?? sampledAccuracy,
          deaths: row.deaths,
          survivalRatio: row.gamesPlayed > 0 ? row.survivalGames / row.gamesPlayed : null,
          disputeRateRatio: weightedDisputeRate ?? sampledDispute,
          gamesPlayed: row.gamesPlayed,
        };
      })
      .sort((left, right) => {
        const leftAccuracy = left.accuracyRatio ?? -1;
        const rightAccuracy = right.accuracyRatio ?? -1;
        if (rightAccuracy !== leftAccuracy) return rightAccuracy - leftAccuracy;
        if (right.claimsConfirmed !== left.claimsConfirmed) return right.claimsConfirmed - left.claimsConfirmed;
        return left.deaths - right.deaths;
      });

    const maxJoinedInGame = [...gameJoiners.values()].reduce((max, set) => Math.max(max, set.size), 0);
    const perGameJoinRatios = [...gameJoiners.entries()]
      .map(([, joined]) => (maxJoinedInGame > 0 ? joined.size / maxJoinedInGame : null))
      .filter((ratio): ratio is number => ratio != null && Number.isFinite(ratio));
    const perGameCompletionRatios = [...gameJoiners.entries()]
      .map(([gameCode, joined]) => {
        if (joined.size === 0) return null;
        const completed = gameCompleters.get(gameCode)?.size ?? 0;
        return completed / joined.size;
      })
      .filter((ratio): ratio is number => ratio != null && Number.isFinite(ratio));
    const perGameDropOffRatios = [...gameJoiners.entries()]
      .map(([gameCode, joined]) => {
        if (joined.size === 0) return null;
        const completed = gameCompleters.get(gameCode)?.size ?? 0;
        return Math.max(0, (joined.size - completed) / joined.size);
      })
      .filter((ratio): ratio is number => ratio != null && Number.isFinite(ratio));

    const joinRate = average(perGameJoinRatios);
    const completionRate = average(perGameCompletionRatios);
    const dropOffRate = average(perGameDropOffRatios);
    const health: SessionHealth = {
      joinRate,
      completionRate,
      dropOffRate,
      status: "insufficient_data",
      indicators: [],
    };
    if (joinRate == null || completionRate == null || dropOffRate == null) {
      health.status = "insufficient_data";
      health.indicators = ["Not enough participation data to classify session health."];
    } else if (completionRate >= 0.75 && dropOffRate <= 0.2) {
      health.status = "healthy";
      health.indicators = ["Strong completion and low drop-off suggest high engagement quality."];
    } else if (completionRate >= 0.5 && dropOffRate <= 0.35) {
      health.status = "watch";
      health.indicators = ["Moderate completion. Review facilitation pacing and participant support."];
    } else {
      health.status = "at_risk";
      health.indicators = ["High drop-off or low completion detected. Engagement intervention recommended."];
    }

    const insights = buildSessionInsights({ players, health });
    const alerts = buildSessionAlerts({ players, health });

    const [canonicalSessionNotesDoc, legacySessionNotesDoc] = await Promise.all([
      adminDb.collection("orgs").doc(orgRow.org.orgId).collection("sessionNotes").doc(sessionGroupId).get(),
      adminDb.collection("organizations").doc(orgRow.org.orgId).collection("sessionNotes").doc(sessionGroupId).get(),
    ]);
    const sessionNoteData =
      (canonicalSessionNotesDoc.exists ? canonicalSessionNotesDoc.data() : legacySessionNotesDoc.data() ?? {}) as
        | {
            notes?: unknown;
            updatedAt?: unknown;
            updatedBy?: unknown;
          }
        | undefined;

    const previewPlayers = players.slice(0, 12);
    const playerNotesDocs = await Promise.all(
      previewPlayers.map((player) =>
        adminDb.collection("orgs").doc(orgRow.org.orgId).collection("managerCoachingNotes").doc(player.playerId).get()
      )
    );
    const playerNotes = previewPlayers
      .map((player, index) => {
        const row = playerNotesDocs[index];
        const data = (row?.data() ?? {}) as { notes?: unknown; updatedAt?: unknown };
        const notes = asNonEmptyString(data.notes);
        if (!notes) return null;
        return {
          playerId: player.playerId,
          displayName: player.displayName,
          notes,
          updatedAt: asNonEmptyString(data.updatedAt),
          primaryGameCode: player.primaryGameCode,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null);

    return NextResponse.json({
      contract: {
        name: "business-session-group-detail",
        version: "2026-03-28.v2",
        compatibility: {
          source: "read_model",
          timelineSource: "managerDashboard.analytics.timeline",
          externalRuntimeDependencies: false,
          staffAnalyticsSource: "managerDashboard.analytics.playerPerformance",
        },
      },
      org: orgRow.org,
      session: {
        ...session,
        summary: {
          playerCount,
          startAt: session.startedAt,
          endAt: session.endedAt,
        },
        migration: {
          isVirtualSession: session.sessionType === "virtual",
          identityNeedsReview: session.identityNeedsReview,
          identitySource: session.identitySource,
          identityConfidence: session.identityConfidence,
        },
        health,
        insights,
        alerts,
        notes: {
          session: {
            text: asNonEmptyString(sessionNoteData?.notes) ?? "",
            updatedAt: asNonEmptyString(sessionNoteData?.updatedAt),
            updatedBy: asNonEmptyString(sessionNoteData?.updatedBy),
          },
          players: playerNotes,
        },
        players,
        timelinePreview,
      },
    });
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before loading session detail." }, { status: 401 });
    }
    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[business:sessions:group-detail] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load session detail." }, { status: 500 });
  }
}
