import {
  nextSearchForDashboardDensity,
  nextSearchForDashboardView,
  parseDashboardDensity,
  parseDashboardView,
} from "@/components/admin/dashboard/view-mode";

describe("dashboard view mode query helpers", () => {
  it("parses view query safely", () => {
    expect(parseDashboardView("")).toBe("table");
    expect(parseDashboardView("?view=table")).toBe("table");
    expect(parseDashboardView("?view=charts")).toBe("charts");
    expect(parseDashboardView("?view=other")).toBe("table");
  });

  it("sets or removes view query while preserving others", () => {
    expect(nextSearchForDashboardView("?foo=1", "charts")).toBe("?foo=1&view=charts");
    expect(nextSearchForDashboardView("?foo=1&view=charts", "table")).toBe("?foo=1");
    expect(nextSearchForDashboardView("?view=charts", "table")).toBe("");
  });

  it("parses and sets density query safely", () => {
    expect(parseDashboardDensity("")).toBe("comfortable");
    expect(parseDashboardDensity("?density=compact")).toBe("compact");
    expect(parseDashboardDensity("?density=other")).toBe("comfortable");

    expect(nextSearchForDashboardDensity("?foo=1", "compact")).toBe("?foo=1&density=compact");
    expect(nextSearchForDashboardDensity("?foo=1&density=compact", "comfortable")).toBe("?foo=1");
    expect(nextSearchForDashboardDensity("?density=compact", "comfortable")).toBe("");
  });
});
