"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="surface-panel mx-auto max-w-xl rounded-3xl px-6 py-10 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-soft">{error.message || "Please refresh and try again."}</p>
      <button
        type="button"
        onClick={reset}
        className="control-secondary mt-6 rounded-xl px-4 py-2"
      >
        Retry
      </button>
    </section>
  );
}


