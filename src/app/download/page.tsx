import Link from "next/link";
import { parseGameCode } from "@/domain/join/code";
import { buildAppJoinLink } from "@/domain/join/links";

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ gameCode?: string }>;
}) {
  const params = await searchParams;
  const parsedCode = parseGameCode(params.gameCode || "");

  return (
    <section className="glass-surface rounded-3xl px-6 py-8 sm:px-8" aria-labelledby="download-title">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Download</p>
      <h1 id="download-title" className="mt-2.5 text-3xl font-bold tracking-tight sm:text-4xl">
        Download Wurder
      </h1>
      <p className="mt-3 max-w-2xl text-soft">
        App store links are being finalized. For now, use this route as the install handoff destination.
      </p>
      {parsedCode.isValid ? (
        <div className="mt-4 border-y border-white/15 py-3 text-sm text-soft">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Preserved game code</p>
          <p className="mt-2 font-mono text-xl font-semibold tracking-[0.08em]">{parsedCode.value}</p>
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2.5">
        {parsedCode.isValid ? (
          <a
            href={buildAppJoinLink(parsedCode.value)}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#C7355D] to-[#8E1F45] px-5 font-semibold text-white transition hover:from-[#D96A5A] hover:to-[#C7355D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e]"
          >
            Open in app
          </a>
        ) : null}
        <Link
          href="/"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/30 bg-white/5 px-5 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e]"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
