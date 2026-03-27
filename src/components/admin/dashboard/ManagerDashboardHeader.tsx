import type { ManagerAnalyticsDocument } from "@/components/admin/types";

type ManagerBranding = {
  companyName: string | null;
  companyLogoUrl: string | null;
  brandAccentColor: string | null;
  brandThemeLabel: string | null;
};

type ManagerDashboardHeaderProps = {
  branding: ManagerBranding | null;
  gameCode: string;
  updatedAtLabel: string;
  analytics: ManagerAnalyticsDocument | null;
};

function StatusBadge({ status }: { status: ManagerAnalyticsDocument["overview"]["lifecycleStatus"] }) {
  const cls =
    status === "completed"
      ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
      : status === "in_progress"
        ? "border-amber-300/45 bg-amber-400/15 text-amber-100"
        : "border-white/20 bg-white/10 text-white/80";
  return <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{status.replace("_", " ")}</span>;
}

export default function ManagerDashboardHeader({ branding, gameCode, updatedAtLabel, analytics }: ManagerDashboardHeaderProps) {
  return (
    <header
      className="relative overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(160deg,rgba(8,10,15,0.95),rgba(17,20,29,0.92))] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
      style={branding?.brandAccentColor ? { borderTopWidth: "4px", borderTopColor: branding.brandAccentColor } : undefined}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(217,106,90,0.2),transparent_36%),radial-gradient(circle_at_88%_14%,rgba(81,125,214,0.16),transparent_35%)]" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          {branding?.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.companyLogoUrl} alt={`${branding.companyName ?? "Company"} logo`} className="h-12 w-12 rounded object-contain" />
          ) : null}
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {branding?.companyName ? `${branding.companyName} Session Dashboard` : "Business Session Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-white/75">Session code: {gameCode || "--"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {analytics ? <StatusBadge status={analytics.overview.lifecycleStatus} /> : null}
              {branding?.brandThemeLabel ? (
                <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
                  Theme: {branding.brandThemeLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs uppercase tracking-wide text-white/75">
          Updated: {updatedAtLabel}
        </div>
      </div>
    </header>
  );
}
