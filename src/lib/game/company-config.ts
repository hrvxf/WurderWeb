import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";

export type CompanyTemplateConfig = {
  mode: string;
  durationMinutes: number;
  wordDifficulty: string;
  teamsEnabled: boolean;
};

export async function createOrganization(input: {
  name: string;
  ownerAccountId: string;
  plan: string;
}): Promise<{ orgId: string }> {
  const orgRef = adminDb.collection("organizations").doc();
  await orgRef.set({
    name: input.name,
    ownerAccountId: input.ownerAccountId,
    plan: input.plan,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { orgId: orgRef.id };
}

export async function createGameTemplate(input: {
  orgId: string;
  name: string;
  config: CompanyTemplateConfig;
  metricsEnabled: string[];
}): Promise<{ templateId: string }> {
  const templateRef = adminDb.collection("gameTemplates").doc();
  await templateRef.set({
    orgId: input.orgId,
    name: input.name,
    config: input.config,
    metricsEnabled: input.metricsEnabled,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { templateId: templateRef.id };
}
