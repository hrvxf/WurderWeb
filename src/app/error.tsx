"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-white/15 bg-black/25 px-6 py-10 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-soft">{error.message || "Please refresh and try again."}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl border border-white/20 bg-white/10 px-4 py-2 hover:bg-white/20"
      >
        Retry
      </button>
    </section>
  );
}


