import type { DeathsBasis } from "@/domain/manager-dashboard/types";

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

export function toNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function safeDivide(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if ((denominator ?? 0) <= 0) return null;
  const result = (numerator ?? 0) / (denominator ?? 1);
  return Number.isFinite(result) ? result : null;
}

export function computeKd(kills: number | null | undefined, deaths: number | null | undefined): number | null {
  return safeDivide(kills, deaths);
}

export function computeAccuracyRatio(confirmedClaims: number | null | undefined, totalClaims: number | null | undefined): number | null {
  return safeDivide(confirmedClaims, totalClaims);
}

export function computeDisputeRateRatio(totalDeniedClaims: number | null | undefined, totalClaims: number | null | undefined): number | null {
  return safeDivide(totalDeniedClaims, totalClaims);
}

export function normalizeMaybePercentRatio(value: unknown): number | null {
  const numeric = toNullableNumber(value);
  if (numeric == null || numeric < 0) return null;
  if (numeric > 1) return safeDivide(numeric, 100);
  return numeric;
}

export function computeDurationMs(input: {
  startedAtMs?: number | null;
  endedAtMs?: number | null;
  nowMs?: number;
}): number | null {
  const startedAtMs = typeof input.startedAtMs === "number" ? input.startedAtMs : null;
  if (startedAtMs == null || !Number.isFinite(startedAtMs)) return null;
  const endedAtMs = typeof input.endedAtMs === "number" ? input.endedAtMs : null;
  const effectiveEndMs = endedAtMs ?? (Number.isFinite(input.nowMs) ? input.nowMs : null);
  if (effectiveEndMs == null || !Number.isFinite(effectiveEndMs)) return null;
  if (effectiveEndMs < startedAtMs) return null;
  return Math.max(0, Math.floor(effectiveEndMs - startedAtMs));
}

export function pickFirstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = asNumber(value);
    if (parsed != null) return parsed;
  }
  return null;
}

export function normalizeMode(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function resolveDeathsBasis(mode: string): DeathsBasis {
  if (mode === "classic") return "confirmed_claims_against_player";
  if (mode.includes("elimination")) return "elimination_deaths";
  return "fallback_death_events";
}

export function eventLabel(eventType: string): string {
  const normalized = eventType.trim().toLowerCase();
  const labelMap: Record<string, string> = {
    game_started: "Game Started",
    game_ended: "Game Ended",
    admin_confirm_kill_claim: "Admin Confirm Kill Claim",
    admin_deny_kill_claim: "Admin Deny Kill Claim",
  };
  if (labelMap[normalized]) return labelMap[normalized];
  return normalized
    .split("_")
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.();
    if (!(maybeDate instanceof Date) || Number.isNaN(maybeDate.getTime())) return null;
    return maybeDate.toISOString();
  }
  return null;
}
