const LEGACY_TELEMETRY_SUNSET_DATE = "2026-06-30";

const seenLegacySurfaceKeys = new Set<string>();

type LegacySurfaceMeta = Record<string, unknown>;

function serializeMeta(meta?: LegacySurfaceMeta): string {
  if (!meta) return "{}";
  try {
    return JSON.stringify(meta);
  } catch {
    return "{}";
  }
}

export function recordLegacySurfaceHit(surface: string, meta?: LegacySurfaceMeta): void {
  const key = `${surface}:${serializeMeta(meta)}`;
  if (seenLegacySurfaceKeys.has(key)) return;
  seenLegacySurfaceKeys.add(key);

  console.warn(
    `[legacy-surface-hit] surface=${surface} sunset=${LEGACY_TELEMETRY_SUNSET_DATE} meta=${serializeMeta(meta)}`
  );
}

