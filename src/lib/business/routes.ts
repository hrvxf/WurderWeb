export const BUSINESS_ROUTES = {
  home: "/business",
  dashboard: "/business/dashboard",
  settings: "/business/settings",
  createSession: "/business/sessions/new",
} as const;

export const BUSINESS_API_ROUTES = {
  sessions: "/api/business/sessions",
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

export function businessSessionAccessApiRoute(gameCode: string): string {
  return `${BUSINESS_API_ROUTES.sessions}/${encodeURIComponent(gameCode)}/access`;
}

export function businessSessionDashboardApiRoute(gameCode: string): string {
  return `${BUSINESS_API_ROUTES.sessions}/${encodeURIComponent(gameCode)}/dashboard`;
}

export function businessSessionDashboardRebuildApiRoute(gameCode: string): string {
  return `${BUSINESS_API_ROUTES.sessions}/${encodeURIComponent(gameCode)}/dashboard/rebuild`;
}

export function businessSessionCompareApiRoute(gameCode: string): string {
  return `${BUSINESS_API_ROUTES.sessions}/${encodeURIComponent(gameCode)}/compare`;
}

export function businessSessionPlayerApiRoute(gameCode: string, playerId: string): string {
  return `${BUSINESS_API_ROUTES.sessions}/${encodeURIComponent(gameCode)}/players/${encodeURIComponent(playerId)}`;
}

export function businessSessionEndApiRoute(gameCode: string): string {
  return `${BUSINESS_API_ROUTES.sessions}/${encodeURIComponent(gameCode)}/end`;
}

export function businessSessionExportApiRoute(gameCode: string, format: string): string {
  return `${BUSINESS_API_ROUTES.sessions}/${encodeURIComponent(gameCode)}/export?format=${encodeURIComponent(format)}`;
}
