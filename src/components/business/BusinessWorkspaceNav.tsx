"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BUSINESS_ROUTES, businessSessionsRoute } from "@/lib/business/routes";

type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: businessSessionsRoute(),
    label: "Sessions",
    match: (pathname) => pathname.startsWith("/business/sessions") || pathname === "/business/dashboard",
  },
  {
    href: BUSINESS_ROUTES.staff,
    label: "Team",
    match: (pathname) => pathname.startsWith("/business/teams") || pathname.startsWith("/business/staff"),
  },
  {
    href: BUSINESS_ROUTES.settings,
    label: "Settings",
    match: (pathname) => pathname.startsWith("/business/settings"),
  },
];

export default function BusinessWorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav className="biz-workspace-nav mb-4" aria-label="Business Workspace">
      <ul className="flex flex-wrap gap-2">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={active ? "biz-tab biz-tab--active" : "biz-tab"}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
