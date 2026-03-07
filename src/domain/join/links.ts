export function buildUniversalJoinLink(gameCode: string): string {
  return `https://wurder.app/join/${encodeURIComponent(gameCode)}`;
}

export function buildAppJoinLink(gameCode: string): string {
  return `wurder://join/${encodeURIComponent(gameCode)}`;
}
