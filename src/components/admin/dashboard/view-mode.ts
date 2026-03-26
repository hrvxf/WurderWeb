export type DashboardView = "table" | "charts";
export type DashboardDensity = "comfortable" | "compact";

export function parseDashboardView(search: string): DashboardView {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("view") === "charts" ? "charts" : "table";
}

export function nextSearchForDashboardView(currentSearch: string, view: DashboardView): string {
  const params = new URLSearchParams(currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch);
  if (view === "table") {
    params.delete("view");
  } else {
    params.set("view", "charts");
  }
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function parseDashboardDensity(search: string): DashboardDensity {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("density") === "compact" ? "compact" : "comfortable";
}

export function nextSearchForDashboardDensity(currentSearch: string, density: DashboardDensity): string {
  const params = new URLSearchParams(currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch);
  if (density === "comfortable") {
    params.delete("density");
  } else {
    params.set("density", "compact");
  }
  const next = params.toString();
  return next ? `?${next}` : "";
}
