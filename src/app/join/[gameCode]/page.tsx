import Link from "next/link";
import { parseGameCode } from "@/domain/join/code";
import { buildAppJoinLink, buildJoinUniversalLink } from "@/domain/join/links";

type JoinGameCodePageProps = {
  params: Promise<{ gameCode: string }>;
};

export default async function JoinGameCodePage({ params }: JoinGameCodePageProps) {
  const { gameCode } = await params;
  const parsedCode = parseGameCode(gameCode);

  if (!parsedCode.isValid) {
    return (
      <section className="glass-surface rounded-3xl px-6 py-10 sm:px-10">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Join</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Invalid game code</h1>
        <p className="mt-4 max-w-2xl text-soft">Game codes must be six uppercase letters or numbers.</p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/5 px-6 font-semibold text-white transition hover:bg-white/10"
          >
            Back to Home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-surface rounded-3xl px-6 py-10 sm:px-10">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Join</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Open Wurder</h1>
      <p className="mt-4 max-w-2xl text-soft">
        Continue into the app to join game <span className="font-mono">{parsedCode.value}</span>.
      </p>

      <div className="mt-5 rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-soft">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Universal link</p>
        <p className="mt-2 break-all">{buildJoinUniversalLink(parsedCode.value)}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={buildAppJoinLink(parsedCode.value)}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#C7355D] to-[#8E1F45] px-6 font-semibold text-white transition hover:from-[#D96A5A] hover:to-[#C7355D]"
        >
          Open in app
        </a>
        <Link
          href={`/download?gameCode=${encodeURIComponent(parsedCode.value)}`}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/5 px-6 font-semibold text-white transition hover:bg-white/10"
        >
          Need the app?
        </Link>
      </div>
    </section>
  );
}
