import { describe, expect, it } from "vitest";

import {
  businessDashboardRoute,
  businessSessionAccessApiRoute,
  businessSessionCompareApiRoute,
  businessSessionDashboardApiRoute,
  businessSessionEndApiRoute,
  businessSessionExportApiRoute,
  businessSessionGroupExportApiRoute,
  businessSessionGroupRoute,
  businessTeamMemberRoute,
  businessTeamMemberSettingsRoute,
  businessSessionPlayerApiRoute,
  businessOrgSettingsRoute,
  businessSessionsRoute,
  businessStaffExportApiRoute,
} from "@/lib/business/routes";

describe("business route boundaries", () => {
  it("uses business session APIs as the primary runtime contract", () => {
    expect(businessDashboardRoute()).toBe("/business/dashboard");
    expect(businessSessionsRoute()).toBe("/business/sessions");
    expect(businessSessionAccessApiRoute("ABC123")).toBe("/api/business/sessions/ABC123/access");
    expect(businessSessionDashboardApiRoute("ABC123")).toBe("/api/business/sessions/ABC123/dashboard");
    expect(businessSessionCompareApiRoute("ABC123")).toBe("/api/business/sessions/ABC123/compare");
    expect(businessSessionPlayerApiRoute("ABC123", "uid1")).toBe("/api/business/sessions/ABC123/players/uid1");
    expect(businessSessionEndApiRoute("ABC123")).toBe("/api/business/sessions/ABC123/end");
    expect(businessSessionExportApiRoute("ABC123", "csv")).toBe("/api/business/sessions/ABC123/export?format=csv");
    expect(businessSessionGroupExportApiRoute("sg_abcd", "csv")).toBe("/api/business/sessions/groups/sg_abcd/export?format=csv");
    expect(businessStaffExportApiRoute("segment=improving")).toBe("/api/business/staff/export?segment=improving");
    expect(businessSessionGroupRoute("sg_abcd")).toBe("/business/sessions/groups/sg_abcd");
    expect(businessTeamMemberRoute("stf_abc")).toBe("/business/teams/stf_abc");
    expect(businessTeamMemberSettingsRoute("stf_abc")).toBe("/business/teams/stf_abc/settings");
    expect(businessOrgSettingsRoute("org_123")).toBe("/business/orgs/org_123/settings");
  });
});
