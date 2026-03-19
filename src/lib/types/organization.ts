import type { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { ProductTier } from "@/lib/product/entitlements";

export type OrgPlan = "b2b";
export type OrgManagerRole = "owner" | "manager";
export type OrgManagerStatus = "active" | "disabled";

export type FirestoreDateValue = FieldValue | Timestamp | Date | null;

export type OrgBranding = {
  companyName: string;
  companyLogoUrl?: string | null;
  brandAccentColor?: string | null;
  brandThemeLabel?: string | null;
};

export type OrgDoc = {
  name: string;
  nameLower?: string;
  ownerAccountId: string;
  tier: ProductTier;
  plan: OrgPlan;
  branding?: OrgBranding;
  createdAt: FirestoreDateValue;
  updatedAt?: FirestoreDateValue;
};

export type OrgManagerMembershipDoc = {
  uid: string;
  role: OrgManagerRole;
  status: OrgManagerStatus;
  isOwner: boolean;
  createdAt: FirestoreDateValue;
};

export type OrgGameLinkDoc = {
  orgId: string;
  gameCode: string;
  createdByAccountId: string;
  templateId: string | null;
  createdAt: FirestoreDateValue;
};

export type OrgTemplateManagerDefaults = {
  minSecondsBeforeClaim: number;
  minSecondsBetweenClaims: number;
  maxActiveClaimsPerPlayer: number;
  freeRefreshCooldownSeconds: number;
};

export type OrgTemplateDoc = {
  orgId: string;
  name: string;
  config: {
    mode: string;
    durationMinutes: number;
    wordDifficulty: string;
    teamsEnabled: boolean;
  };
  metricsEnabled: string[];
  managerDefaults: OrgTemplateManagerDefaults;
  createdByAccountId: string;
  createdAt: FirestoreDateValue;
};
