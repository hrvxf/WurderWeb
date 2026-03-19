export const PRODUCT_TIERS = ["basic", "pro", "enterprise"] as const;

export type ProductTier = (typeof PRODUCT_TIERS)[number];

export type ProductFeature =
  | "singleSession"
  | "limitedMetrics"
  | "managerDashboard"
  | "managerInsights"
  | "managerSummaries"
  | "orgDashboard"
  | "templateReuse"
  | "exports"
  | "branding";

export type ProductEntitlements = Record<ProductFeature, boolean>;

const ENTITLEMENTS_BY_TIER: Record<ProductTier, ProductEntitlements> = {
  basic: {
    singleSession: true,
    limitedMetrics: true,
    managerDashboard: true,
    managerInsights: false,
    managerSummaries: false,
    orgDashboard: false,
    templateReuse: false,
    exports: false,
    branding: false,
  },
  pro: {
    singleSession: true,
    limitedMetrics: true,
    managerDashboard: true,
    managerInsights: true,
    managerSummaries: true,
    orgDashboard: false,
    templateReuse: false,
    exports: false,
    branding: false,
  },
  enterprise: {
    singleSession: true,
    limitedMetrics: true,
    managerDashboard: true,
    managerInsights: true,
    managerSummaries: true,
    orgDashboard: true,
    templateReuse: true,
    exports: true,
    branding: true,
  },
};

export function normalizeProductTier(value: unknown): ProductTier {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "basic") return "basic";
  if (raw === "pro") return "pro";
  if (raw === "enterprise") return "enterprise";
  return "enterprise";
}

export function entitlementsForTier(tier: ProductTier): ProductEntitlements {
  return ENTITLEMENTS_BY_TIER[tier];
}

export function hasFeature(tier: ProductTier, feature: ProductFeature): boolean {
  return ENTITLEMENTS_BY_TIER[tier][feature] === true;
}
