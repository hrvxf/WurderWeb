import Link from "next/link";

type BusinessStatePanelProps = {
  tone?: "neutral" | "loading" | "error" | "empty";
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function BusinessStatePanel({
  tone = "neutral",
  title,
  message,
  actionLabel,
  actionHref,
}: BusinessStatePanelProps) {
  const toneClass =
    tone === "error"
      ? "biz-state-panel--error border-red-200 bg-red-50 text-red-900"
      : tone === "loading"
      ? "biz-state-panel--loading border-blue-200 bg-blue-50 text-slate-900"
      : tone === "empty"
      ? "biz-state-panel--empty border-slate-200 bg-slate-50 text-slate-900"
      : "biz-state-panel--neutral border-slate-200 bg-white text-slate-900";

  return (
    <section className={`biz-state-panel rounded-lg border p-5 shadow-sm ${toneClass}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm">{message}</p>
      {actionLabel && actionHref ? (
        <div className="mt-3">
          <Link href={actionHref} className="biz-btn biz-btn--soft">
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
