import { buildJoinUniversalLink as buildCanonicalJoinUniversalLink } from "@/domain/join/joinLink";

export function buildUniversalJoinLink(gameCode: string): string {
  return buildCanonicalJoinUniversalLink(gameCode);
}

export function buildJoinUniversalLink(gameCode: string): string {
  return buildCanonicalJoinUniversalLink(gameCode);
}

export function buildAppJoinLink(gameCode: string): string {
  return `wurder://join/${encodeURIComponent(gameCode)}`;
}
