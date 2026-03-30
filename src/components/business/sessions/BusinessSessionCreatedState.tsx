import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";

import { businessSessionRoute, businessSessionsRoute, joinRoute } from "@/lib/business/routes";

type CreatedBusinessSessionResult = {
  gameCode: string;
  orgId: string;
  orgName: string;
  joinLink: string;
  managerParticipation: "host_only" | "host_player";
};

type BusinessSessionCreatedStateProps = {
  result: CreatedBusinessSessionResult;
  copyState: { gameCode: boolean; joinLink: boolean };
  onCopyGameCode: () => void;
  onCopyJoinLink: () => void;
  onCreateAnother: () => void;
};

export default function BusinessSessionCreatedState({
  result,
  copyState,
  onCopyGameCode,
  onCopyJoinLink,
  onCreateAnother,
}: BusinessSessionCreatedStateProps) {
  const sessionDashboardHref = businessSessionRoute(result.gameCode);
  const joinAsPlayerHref = joinRoute(result.gameCode);
  const isHostOnly = result.managerParticipation === "host_only";

  return (
    <section className="animate-subtle-enter space-y-5 rounded-2xl border border-emerald-300/35 bg-emerald-500/10 p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Business Session Created</p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your business session is ready</h2>
        <p className="text-sm text-emerald-100/85">
          Analytics are enabled for this business session and will be available in session reporting.
        </p>
        <p className="text-sm text-emerald-100/85">
          {isHostOnly
            ? "You are set to host and monitor the session without joining gameplay."
            : "You can host the session and also join gameplay as a participant."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-white/15 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-white/70">Organisation</p>
          <p className="mt-2 text-lg font-medium text-white">{result.orgName}</p>
        </article>
        <article className="rounded-xl border border-white/15 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-white/70">Session code</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-[0.14em] text-white">{result.gameCode}</p>
        </article>
        <article className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 sm:col-span-2">
          <p className="text-xs uppercase tracking-[0.16em] text-white/70">Manager role</p>
          <p className="mt-2 text-sm font-medium text-white">
            {isHostOnly ? "Host only" : "Host participates as a player"}
          </p>
        </article>
      </div>

      <div className="rounded-xl border border-white/15 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-white/70">Session join QR</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="inline-flex w-fit rounded-xl bg-white p-3">
            <QRCodeCanvas value={result.joinLink} size={168} level="M" fgColor="#111111" bgColor="#FFFFFF" marginSize={2} />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.16em] text-white/70">Join link</p>
            <p className="mt-2 break-all text-sm text-white/85">{result.joinLink}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          onClick={onCopyGameCode}
        >
          {copyState.gameCode ? "Session code copied" : "Copy session code"}
        </button>
        <button
          type="button"
          className="rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          onClick={onCopyJoinLink}
        >
          {copyState.joinLink ? "Join link copied" : "Copy join link"}
        </button>
        <button
          type="button"
          className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          onClick={onCreateAnother}
        >
          Create another session
        </button>
        <Link
          href={sessionDashboardHref}
          className="inline-flex items-center justify-center rounded-xl border border-[#c4d6f3] bg-[#d9e6fb] px-4 py-2.5 text-sm font-semibold text-[#0b1628] transition hover:bg-[#cddff8]"
        >
          Open session dashboard
        </Link>
        <Link
          href={businessSessionsRoute()}
          className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:col-span-2"
        >
          Go to Sessions
        </Link>
        {!isHostOnly ? (
          <Link
            href={joinAsPlayerHref}
            className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:col-span-2"
          >
            Join as host-player
          </Link>
        ) : null}
      </div>
    </section>
  );
}
