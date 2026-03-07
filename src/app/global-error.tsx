"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main className="mx-auto mt-16 max-w-xl rounded-2xl border border-white/10 bg-black/30 p-8 text-white">
          <h1 className="text-2xl font-bold">Unexpected error</h1>
          <p className="mt-3 text-soft">{error.message || "Please try again."}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
          >
            Retry
          </button>
        </main>
      </body>
    </html>
  );
}


