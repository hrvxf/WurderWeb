import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { normalizeProductTier, type ProductTier } from "@/lib/product/entitlements";

type OrgTierDoc = {
  tier?: unknown;
};

export async function resolveOrganizationTier(orgId: string): Promise<ProductTier> {
  const canonical = await adminDb.collection("orgs").doc(orgId).get();
  if (canonical.exists) {
    return normalizeProductTier(((canonical.data() ?? {}) as OrgTierDoc).tier);
  }

  const legacy = await adminDb.collection("organizations").doc(orgId).get();
  if (legacy.exists) {
    return normalizeProductTier(((legacy.data() ?? {}) as OrgTierDoc).tier);
  }

  return "enterprise";
}
