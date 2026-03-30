export const BUSINESS_ROUTES = {
  home: "/business",
  dashboard: "/business/dashboard",
  settings: "/business/settings",
  sessions: "/business/sessions",
  staff: "/business/teams",
  sessionGroups: "/business/sessions/groups",
  createSession: "/business/sessions/new",
} as const;

export const BUSINESS_API_ROUTES = {
  sessions: "/api/business/sessions",
  staff: "/api/business/staff",
} as const;

export function businessDashboardRoute(): string {
  return BUSINESS_ROUTES.dashboard;
}

export function businessSessionsRoute(): string {
  return BUSINESS_ROUTES.sessions;
}

export function businessSessionRoute(gameCode: string): string {
  return `/business/sessions/${encodeURIComponent(gameCode)}`;
}

export function businessTeamMemberRoute(staffKey: string): string {
  return `/business/teams/${encodeURIComponent(staffKey)}`;
}

export function businessTeamMemberSettingsRoute(staffKey: string): string {
  return `/business/teams/${encodeURIComponent(staffKey)}/settings`;
}

export function businessSessionGroupRoute(sessionId: string): string {
  return `/business/sessions/groups/${encodeURIComponent(sessionId)}`;
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

export function businessOrgSettingsRoute(orgId: string): string {
  return `/business/orgs/${encodeURIComponent(orgId)}/settings`;
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

export function businessSessionGroupExportApiRoute(sessionGroupId: string, format: string): string {
  return `${BUSINESS_API_ROUTES.sessions}/groups/${encodeURIComponent(sessionGroupId)}/export?format=${encodeURIComponent(format)}`;
}

export function businessStaffExportApiRoute(search: string): string {
  const normalized = search.trim().replace(/^\?+/, "");
  return `${BUSINESS_API_ROUTES.staff}/export${normalized ? `?${normalized}` : ""}`;
}
