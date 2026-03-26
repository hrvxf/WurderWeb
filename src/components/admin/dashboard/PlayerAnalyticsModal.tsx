import Link from "next/link";

import type { ManagerPlayerPerformance } from "@/components/admin/types";

type PlayerAnalyticsModalProps = {
  player: ManagerPlayerPerformance | null;
  gameCode: string;
  onClose: () => void;
};

function formatCount(value: number | null): string {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return (value ?? 0).toLocaleString();
}

function formatRatio(value: number | null, precision = 2): string {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return (value ?? 0).toFixed(precision);
}

function formatPercentFromRatio(value: number | null): string {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return `${((value ?? 0) * 100).toFixed(1)}%`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/[0.04] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-white/60">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function initialFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0]?.toUpperCase() ?? "?";
}

function PlayerAvatar({ player }: { player: ManagerPlayerPerformance }) {
  if (player.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={player.avatarUrl} alt={`${player.displayName} avatar`} className="h-11 w-11 rounded-full border border-white/20 object-cover" />;
  }

  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-white/85">
      {initialFromName(player.displayName)}
    </span>
  );
}

export default function PlayerAnalyticsModal({ player, gameCode, onClose }: PlayerAnalyticsModalProps) {
  if (!player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[linear-gradient(165deg,rgba(14,17,24,0.96),rgba(9,12,18,0.98))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <PlayerAvatar player={player} />
            <div>
              <h3 className="text-lg font-semibold text-white">{player.displayName}</h3>
              <p className="text-xs text-white/55">Player ID: {player.playerId}</p>
            </div>
          </div>
          <button
            className="rounded-md border border-white/25 bg-white/[0.05] px-2.5 py-1 text-sm text-white/85 hover:bg-white/[0.12]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Kills" value={formatCount(player.kills)} />
          <Metric label="Deaths" value={formatCount(player.deaths)} />
          <Metric label="K/D Ratio" value={formatRatio(player.kdRatio, 2)} />
          <Metric label="Accuracy" value={formatPercentFromRatio(player.accuracyRatio)} />
          <Metric label="Dispute Rate" value={formatPercentFromRatio(player.disputeRateRatio)} />
          <Metric label="Sessions" value={formatCount(player.sessionCount)} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Claims Submitted" value={formatCount(player.claimsSubmitted)} />
          <Metric label="Claims Confirmed" value={formatCount(player.claimsConfirmed)} />
          <Metric label="Claims Denied" value={formatCount(player.claimsDenied)} />
        </div>

        <div className="mt-4 rounded-lg border border-white/12 bg-white/[0.04] p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-white/60">Deaths Basis</p>
          <p className="mt-1 text-sm text-white/85">{player.deathsBasis.replace(/_/g, " ")}</p>
        </div>
        <div className="mt-4 flex justify-end">
          <Link
            href={`/manager/${encodeURIComponent(gameCode)}/players/${encodeURIComponent(player.playerId)}`}
            className="rounded-md border border-white/25 bg-white/[0.05] px-2.5 py-1 text-sm text-white/85 hover:bg-white/[0.12]"
          >
            Open full player drill-down
          </Link>
        </div>
      </div>
    </div>
  );
}
