"use client";

import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/domain/analytics/events";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

const SESSION_STORAGE_KEY = "wurder_web_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const generated = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
}

export function trackEvent(event: AnalyticsEventName, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    session_id: getSessionId(),
    ...props,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);

  if (typeof window.gtag === "function") {
    window.gtag("event", event, payload);
  }
}

export { ANALYTICS_EVENTS };


