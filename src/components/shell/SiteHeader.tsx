"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import Button from "@/components/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";
import { BUSINESS_ROUTES } from "@/lib/business/routes";

type NavLink = {
  href: string;
  label: string;
  description?: string;
  matchPrefix?: boolean;
  icon: "home" | "product" | "business" | "download" | "help";
};

type SiteHeaderInitialAccount = {
  displayName: string;
  wurderId: string | null;
  avatarUrl: string | null;
};

const EXPLORE_LINKS: NavLink[] = [
  { href: "/", label: "Home", description: "Landing and latest updates", icon: "home" },
  { href: "/product", label: "Product", description: "Capabilities and plans", icon: "product" },
  { href: BUSINESS_ROUTES.home, label: "Business", description: "Company sessions and tools", icon: "business" },
  { href: "/download", label: "Download", description: "Get the mobile app", icon: "download" },
];

const HELP_LINKS: NavLink[] = [
  { href: "/contact", label: "Support", icon: "help" },
  { href: "/privacy", label: "Privacy", icon: "help" },
  { href: "/terms", label: "Terms", icon: "help" },
];

const MEMBER_ACCOUNT_LINKS = [
  { href: AUTH_ROUTES.members, label: "Dashboard" },
  { href: AUTH_ROUTES.membersProfile, label: "Profile" },
  { href: AUTH_ROUTES.membersStats, label: "Stats" },
  { href: AUTH_ROUTES.membersHost, label: "Host" },
  { href: AUTH_ROUTES.membersSettings, label: "Settings" },
] as const;

const MENU_ANIMATION_MS = 180;
const AVATAR_CACHE_KEY = "wurder:member:avatar-url";

function getInitials(name?: string, wurderId?: string): string {
  const source = (name?.trim() || wurderId?.trim() || "W").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "W").toUpperCase();
}

function AccountAvatar({
  avatarUrl,
  initials,
  className,
}: {
  avatarUrl: string | null;
  initials: string;
  className: string;
}) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt="Account avatar" className={`${className} rounded-full border border-white/15 object-cover`} />;
  }

  return (
    <span className={`${className} inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-bold text-white`}>
      {initials}
    </span>
  );
}

function iconPath(icon: NavLink["icon"]): string {
  switch (icon) {
    case "home":
      return "M3 11.5 12 4l9 7.5M6.5 10.5V20h11V10.5";
    case "product":
      return "M4 8.5 12 4l8 4.5-8 4.5-8-4.5ZM4 8.5V16l8 4.5 8-4.5V8.5";
    case "business":
      return "M4 20V7l8-3v16M4 20h16M13 10h3m-3 4h3m-3 4h3M8 10h1m-1 4h1m-1 4h1";
    case "download":
      return "M12 4v10m0 0 4-4m-4 4-4-4M4 20h16";
    default:
      return "M12 8v5m0 3h.01M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0";
  }
}

function isActive(pathname: string, item: NavLink): boolean {
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}

function MenuRow({
  item,
  pathname,
  compact = false,
}: {
  item: NavLink;
  pathname: string;
  compact?: boolean;
}) {
  const active = isActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group block rounded-xl border px-3 py-2.5 transition ${
        active
          ? "border-[#D96A5A]/45 bg-[#D96A5A]/15 text-white"
          : "border-white/10 bg-white/[0.03] text-white/85 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
            active ? "border-[#D96A5A]/60 bg-[#D96A5A]/20" : "border-white/15 bg-black/30"
          }`}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="text-white">
            <path d={iconPath(item.icon)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{item.label}</span>
          {!compact && item.description ? (
            <span className="block truncate text-xs text-white/55">{item.description}</span>
          ) : null}
        </span>
        <span className="text-white/40 transition group-hover:text-white/75">{">"}</span>
      </div>
    </Link>
  );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

function handleMenuKeyNav(container: HTMLElement, event: KeyboardEvent) {
  const focusables = getFocusableElements(container);
  if (focusables.length === 0) return;

  const activeIndex = focusables.findIndex((el) => el === document.activeElement);

  if (event.key === "Tab") {
    if (event.shiftKey) {
      if (activeIndex <= 0) {
        event.preventDefault();
        focusables[focusables.length - 1]?.focus();
      }
    } else if (activeIndex === -1 || activeIndex === focusables.length - 1) {
      event.preventDefault();
      focusables[0]?.focus();
    }
    return;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      activeIndex === -1
        ? 0
        : (activeIndex + delta + focusables.length) % focusables.length;
    focusables[nextIndex]?.focus();
  }
}

function memberSectionLabel(pathname: string): string | null {
  const match = MEMBER_ACCOUNT_LINKS.find((item) => item.href === pathname);
  return match?.label ?? null;
}

export default function SiteHeader({ initialAccount = null }: { initialAccount?: SiteHeaderInitialAccount | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout, profile } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [desktopMenuVisible, setDesktopMenuVisible] = useState(false);
  const [businessWorkspaceActivated, setBusinessWorkspaceActivated] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [cachedAvatarUrl, setCachedAvatarUrl] = useState<string | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLElement | null>(null);

  const hasInitialAccount = Boolean(initialAccount);
  const effectiveAuthenticated = isAuthenticated || (loading && hasInitialAccount);
  const displayName = profile?.name?.trim() || initialAccount?.displayName || "Member";
  const displayWurderId =
    profile?.wurderId?.trim()
      ? `@${profile.wurderId.trim()}`
      : initialAccount?.wurderId?.trim()
        ? `@${initialAccount.wurderId.trim()}`
        : "Wurder ID not set";
  const initials = useMemo(
    () => getInitials(profile?.name ?? initialAccount?.displayName, profile?.wurderId ?? initialAccount?.wurderId ?? undefined),
    [initialAccount?.displayName, initialAccount?.wurderId, profile?.name, profile?.wurderId]
  );
  const liveAvatarUrl =
    profile?.avatarUrl?.trim() ||
    profile?.avatar?.trim() ||
    user?.photoURL?.trim() ||
    initialAccount?.avatarUrl?.trim() ||
    null;
  const avatarUrl = liveAvatarUrl || cachedAvatarUrl;

  const activeAreaLabel = useMemo(() => {
    if (pathname.startsWith("/members")) {
      const section = memberSectionLabel(pathname);
      return section ? `Members / ${section}` : "Members";
    }
    if (pathname.startsWith("/manager/")) return "Business";
    if (pathname.startsWith("/business")) return "Business";
    return null;
  }, [pathname]);

  useEffect(() => {
    if (!effectiveAuthenticated || !user) {
      setBusinessWorkspaceActivated(false);
      return;
    }

    let cancelled = false;
    const resolveAccess = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/business/workspace-access", {
          headers: { authorization: `Bearer ${token}` },
        });
        const payload = (await response.json().catch(() => ({}))) as { activated?: unknown };
        if (cancelled) return;
        setBusinessWorkspaceActivated(response.ok && payload.activated === true);
      } catch {
        if (cancelled) return;
        setBusinessWorkspaceActivated(false);
      }
    };

    void resolveAccess();

    return () => {
      cancelled = true;
    };
  }, [effectiveAuthenticated, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = window.localStorage.getItem(AVATAR_CACHE_KEY)?.trim() ?? "";
    setCachedAvatarUrl(cached.length > 0 ? cached : null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !liveAvatarUrl) return;
    const img = new window.Image();
    img.src = liveAvatarUrl;
    window.localStorage.setItem(AVATAR_CACHE_KEY, liveAvatarUrl);
    setCachedAvatarUrl(liveAvatarUrl);
  }, [liveAvatarUrl]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setDesktopMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuVisible(true);
      return;
    }
    if (!mobileMenuVisible) return;
    const timer = window.setTimeout(() => setMobileMenuVisible(false), MENU_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [mobileMenuOpen, mobileMenuVisible]);

  useEffect(() => {
    if (desktopMenuOpen) {
      setDesktopMenuVisible(true);
      return;
    }
    if (!desktopMenuVisible) return;
    const timer = window.setTimeout(() => setDesktopMenuVisible(false), MENU_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [desktopMenuOpen, desktopMenuVisible]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuVisible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuVisible]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        setDesktopMenuOpen(false);
        return;
      }
      if (mobileMenuVisible && mobileMenuRef.current) {
        handleMenuKeyNav(mobileMenuRef.current, event);
      } else if (desktopMenuVisible && desktopMenuRef.current) {
        handleMenuKeyNav(desktopMenuRef.current, event);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [desktopMenuVisible, mobileMenuVisible]);

  useEffect(() => {
    if (!desktopMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const node = desktopMenuRef.current;
      if (!node) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (node.contains(target)) return;
      setDesktopMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [desktopMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen || !mobileMenuRef.current) return;
    const focusables = getFocusableElements(mobileMenuRef.current);
    focusables[0]?.focus();
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!desktopMenuOpen || !desktopMenuRef.current) return;
    const focusables = getFocusableElements(desktopMenuRef.current);
    focusables[0]?.focus();
  }, [desktopMenuOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logout();
      setMobileMenuOpen(false);
      setDesktopMenuOpen(false);
      router.replace(AUTH_ROUTES.login);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(180deg,rgba(15,17,21,0.84)_0%,rgba(15,17,21,0.74)_100%)] backdrop-blur-md transition-[box-shadow,background-color] duration-200 ${
          scrolled ? "shadow-[0_8px_24px_rgba(0,0,0,0.28)]" : ""
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
        <div className="page-wrap flex h-16 items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/wurder_gold.png" alt="Wurder" width={156} height={44} priority />
          </Link>

          <nav className="hidden items-center gap-3 md:flex" aria-label="Explore">
            {EXPLORE_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item) ? "page" : undefined}
                className={`relative rounded-md px-2.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  isActive(pathname, item) ? "text-white" : "text-soft hover:text-white"
                }`}
              >
                {item.label}
                {isActive(pathname, item) ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#D96A5A]" />
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {effectiveAuthenticated && activeAreaLabel ? (
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white/75">
                {activeAreaLabel}
              </span>
            ) : null}
            <Button href="/join" variant="glass">
              Join game
            </Button>

            {effectiveAuthenticated ? (
              <div className="relative" ref={desktopMenuRef}>
                <button
                  type="button"
                  aria-label="Open account menu"
                  aria-expanded={desktopMenuOpen}
                  aria-controls="desktop-account-menu"
                  onClick={() => setDesktopMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <AccountAvatar avatarUrl={avatarUrl} initials={initials} className="h-7 w-7" />
                  <span className="max-w-[140px] truncate">{displayName}</span>
                </button>
                {desktopMenuVisible ? (
                  <div
                    id="desktop-account-menu"
                    className={`absolute right-0 top-[calc(100%+10px)] z-50 w-[330px] rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#1A1D23_0%,#121316_100%)] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.45)] transition-all duration-200 ${
                      desktopMenuOpen
                        ? "translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"
                    }`}
                  >
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                      <div className="flex items-center gap-3">
                        <AccountAvatar avatarUrl={avatarUrl} initials={initials} className="h-10 w-10 text-sm" />
                        <div>
                          <p className="text-sm font-semibold text-white">{displayName}</p>
                          <p className="text-xs text-white/60">{displayWurderId}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {MEMBER_ACCOUNT_LINKS.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={pathname === item.href ? "page" : undefined}
                          className={`block rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                            pathname === item.href
                              ? "border-[#D96A5A]/45 bg-[#D96A5A]/15 text-white"
                              : "border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]"
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                      {businessWorkspaceActivated ? (
                        <Link
                          href={BUSINESS_ROUTES.dashboard}
                          className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.08]"
                        >
                          Open Business dashboard
                        </Link>
                      ) : null}
                    </div>
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        disabled={signingOut}
                        className="w-full rounded-lg border border-red-200/30 bg-red-600/20 px-3 py-2 text-left text-sm font-semibold text-red-100 transition hover:bg-red-600/30 disabled:opacity-60"
                      >
                        {signingOut ? "Signing out..." : "Sign Out"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : loading ? (
              <div className="h-10 w-36 animate-pulse rounded-xl border border-white/15 bg-white/[0.06]" />
            ) : (
              <Button href={AUTH_ROUTES.login} variant="ghost">
                Sign In
              </Button>
            )}
          </div>

          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-black/30 text-white transition hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:hidden"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d={mobileMenuOpen ? "M6 6L18 18M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {mobileMenuVisible ? (
        <div className="md:hidden">
          <button
            type="button"
            className={`fixed inset-x-0 bottom-0 top-16 z-40 bg-black/60 transition-opacity duration-200 ${
              mobileMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            id="mobile-menu"
            ref={mobileMenuRef}
            className={`fixed bottom-0 right-0 top-16 z-50 w-[88vw] max-w-[380px] overflow-y-auto border-l border-white/10 bg-[linear-gradient(180deg,#181B21_0%,#111216_100%)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition-all duration-200 ${
              mobileMenuOpen ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white/85">Menu</p>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg border border-white/20 px-2 py-1 text-xs font-semibold text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
            {effectiveAuthenticated ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <div className="flex items-center gap-3">
                  <AccountAvatar avatarUrl={avatarUrl} initials={initials} className="h-10 w-10 text-sm" />
                  <div>
                    <p className="text-sm font-semibold text-white">{displayName}</p>
                    <p className="text-xs text-white/60">{displayWurderId}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 space-y-2">
              <p className="text-xs uppercase tracking-wide text-white/45">Explore</p>
              {EXPLORE_LINKS.map((item) => (
                <MenuRow key={item.href} item={item} pathname={pathname} />
              ))}
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-xs uppercase tracking-wide text-white/45">Account</p>
              <Link
                href="/join"
                className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.08]"
              >
                Join game
              </Link>
              {effectiveAuthenticated ? (
                <>
                  {MEMBER_ACCOUNT_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={`block rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                        pathname === item.href
                          ? "border-[#D96A5A]/45 bg-[#D96A5A]/15 text-white"
                          : "border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  {businessWorkspaceActivated ? (
                    <Link
                      href={BUSINESS_ROUTES.dashboard}
                      className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.08]"
                    >
                      Open Business dashboard
                    </Link>
                  ) : null}
                </>
              ) : (
                loading ? (
                  <div className="space-y-2">
                    <div className="h-10 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
                    <div className="h-10 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
                  </div>
                ) : (
                  <>
                  <Link
                    href={AUTH_ROUTES.login}
                    className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.08]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href={AUTH_ROUTES.signup}
                    className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.08]"
                  >
                    Create Account
                  </Link>
                  </>
                )
              )}
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-xs uppercase tracking-wide text-white/45">Help</p>
              <div className="flex flex-wrap gap-2">
                {HELP_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/[0.08] hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {effectiveAuthenticated ? (
              <div className="mt-5 border-t border-white/10 pt-4">
                <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <p className="text-sm font-semibold text-white">{displayName}</p>
                  <p className="text-xs text-white/60">{displayWurderId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="w-full rounded-lg border border-red-200/30 bg-red-600/20 px-3 py-2.5 text-left text-sm font-semibold text-red-100 transition hover:bg-red-600/30 disabled:opacity-60"
                >
                  {signingOut ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
