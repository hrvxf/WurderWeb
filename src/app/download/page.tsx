import Link from "next/link";

export default function DownloadPage() {
  return (
    <section className="glass-surface rounded-3xl px-6 py-10 sm:px-10" aria-labelledby="download-title">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Download</p>
      <h1 id="download-title" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        Download Wurder
      </h1>
      <p className="mt-4 max-w-2xl text-soft">
        App store links are being finalized. For now, use this route as the install handoff destination.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/5 px-6 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e]"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
