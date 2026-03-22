export const BUSINESS_ROUTES = {
  home: "/business",
  dashboard: "/business/dashboard",
  settings: "/business/settings",
  createSession: "/admin/create-company-game",
} as const;

export function managerDashboardRoute(gameCode: string): string {
  return `/manager/${encodeURIComponent(gameCode)}`;
}

export function joinRoute(gameCode: string): string {
  return `/join/${encodeURIComponent(gameCode)}`;
}
