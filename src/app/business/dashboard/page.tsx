import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { businessSessionRoute, businessSessionsRoute } from "@/lib/business/routes";

export const metadata: Metadata = {
  title: "Business Dashboard",
  description: "Business sessions index entry point.",
  alternates: { canonical: "/business/dashboard" },
};

type BusinessDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BusinessDashboardPage({ searchParams }: BusinessDashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const quickOpenValue = params.gameCode;
  const quickOpenCode = (Array.isArray(quickOpenValue) ? quickOpenValue[0] : quickOpenValue)?.trim() ?? "";
  if (quickOpenCode) {
    redirect(businessSessionRoute(quickOpenCode));
  }

  const nextParams = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(params)) {
    if (key === "gameCode") continue;
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        if (value != null && value.length > 0) nextParams.append(key, value);
      }
      continue;
    }
    if (rawValue != null && rawValue.length > 0) nextParams.set(key, rawValue);
  }

  const query = nextParams.toString();
  redirect(query ? `${businessSessionsRoute()}?${query}` : businessSessionsRoute());
}
