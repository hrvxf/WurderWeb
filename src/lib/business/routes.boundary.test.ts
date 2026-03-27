import { describe, expect, it } from "vitest";

import {
  businessSessionAccessApiRoute,
  businessSessionCompareApiRoute,
  businessSessionDashboardApiRoute,
  businessSessionEndApiRoute,
  businessSessionExportApiRoute,
  businessSessionPlayerApiRoute,
} from "@/lib/business/routes";

describe("business route boundaries", () => {
  it("uses business session APIs as the primary runtime contract", () => {
    expect(businessSessionAccessApiRoute("ABC123")).toBe("/api/business/sessions/ABC123/access");
    expect(businessSessionDashboardApiRoute("ABC123")).toBe("/api/business/sessions/ABC123/dashboard");
    expect(businessSessionCompareApiRoute("ABC123")).toBe("/api/business/sessions/ABC123/compare");
    expect(businessSessionPlayerApiRoute("ABC123", "uid1")).toBe("/api/business/sessions/ABC123/players/uid1");
    expect(businessSessionEndApiRoute("ABC123")).toBe("/api/business/sessions/ABC123/end");
    expect(businessSessionExportApiRoute("ABC123", "csv")).toBe("/api/business/sessions/ABC123/export?format=csv");
  });
});

