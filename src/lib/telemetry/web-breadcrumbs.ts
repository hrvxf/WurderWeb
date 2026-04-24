type Breadcrumb = {
  category: string;
  message: string;
  level?: "info" | "warning" | "error";
  data?: Record<string, unknown>;
};

type SentryLike = {
  addBreadcrumb?: (breadcrumb: Breadcrumb) => void;
};

function resolveSentryLike(): SentryLike | null {
  const scope = globalThis as typeof globalThis & {
    Sentry?: SentryLike;
    __SENTRY__?: { hub?: SentryLike };
  };

  if (scope.Sentry?.addBreadcrumb) {
    return scope.Sentry;
  }

  if (scope.__SENTRY__?.hub?.addBreadcrumb) {
    return scope.__SENTRY__.hub;
  }

  return null;
}

export function addOptionalWebSentryBreadcrumb(breadcrumb: Breadcrumb) {
  resolveSentryLike()?.addBreadcrumb?.(breadcrumb);
}
