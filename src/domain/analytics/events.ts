export const ANALYTICS_EVENTS = {
  joinPageView: "join_page_view",
  joinCodeValid: "join_code_valid",
  joinOpenAttempt: "join_open_attempt",
  joinOpenSuccessProxy: "join_open_success_proxy",
  joinFallbackShown: "join_fallback_shown",
  joinInstallClick: "join_install_click",
  purchaseStarted: "purchase_started",
  purchaseSuccess: "purchase_success",
  purchaseError: "purchase_error",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
