import { normalizeSessionGameType, type SessionGameType } from "@/lib/game/session-type";

export type SessionGameTypeFilter = SessionGameType | "all";

export function parseMemberGameTypeFilter(value: string | null): SessionGameTypeFilter {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "all") return "all";
  return normalizeSessionGameType(normalized) ?? "b2c";
}

