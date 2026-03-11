import { buildJoinUniversalLink as buildCanonicalJoinUniversalLink } from "@/domain/join/joinLink";
import { parseGameCode } from "@/domain/join/code";

export function buildUniversalJoinLink(gameCode: string): string {
  return buildCanonicalJoinUniversalLink(gameCode);
}

export function buildJoinUniversalLink(gameCode: string): string {
  return buildCanonicalJoinUniversalLink(gameCode);
}

export function buildAppJoinLink(gameCode: string): string {
  const parsed = parseGameCode(gameCode);
  if (!parsed.isValid) {
    return "wurder://join";
  }

  return `wurder://join/${parsed.value}`;
}
