export const BUSINESS_ROUTES = {
  home: "/business",
  dashboard: "/business/dashboard",
  settings: "/business/settings",
  createSession: "/business/sessions/new",
} as const;

export function businessSessionRoute(gameCode: string): string {
  return `/business/sessions/${encodeURIComponent(gameCode)}`;
}

export function businessSessionCompareRoute(gameCode: string): string {
  return `/business/sessions/${encodeURIComponent(gameCode)}/compare`;
}

export function businessSessionPlayerRoute(gameCode: string, playerId: string): string {
  return `/business/sessions/${encodeURIComponent(gameCode)}/players/${encodeURIComponent(playerId)}`;
}

export function businessOrgRoute(orgId: string): string {
  return `/business/orgs/${encodeURIComponent(orgId)}`;
}

export function joinRoute(gameCode: string): string {
  return `/join/${encodeURIComponent(gameCode)}`;
}
