function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pickFirstMetric(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = asFiniteNumber(source[key]);
    if (value == null) continue;
    return Math.max(0, value);
  }
  return null;
}

export function resolveDefeatsFromAnalyticsRow(row: Record<string, unknown>): number {
  return (
    pickFirstMetric(row, [
      "defeats",
      "caught",
      "timesCaught",
      "timesDefeated",
      "successfulClaimsAgainst",
      // Legacy field used by older analytics materializers.
      "deaths",
      "deathCount",
    ]) ?? 0
  );
}

export function resolveLifetimeDefeatsFromProfile(source: Record<string, unknown>): number {
  return (
    pickFirstMetric(source, [
      "lifetimeDefeats",
      "lifetimeCaught",
      "lifetimeCaughtCount",
      "lifetimeSuccessfulClaimsAgainst",
      // Legacy/back-compat fields.
      "lifetimeDeaths",
      "deaths",
    ]) ?? 0
  );
}
