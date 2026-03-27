import type { SetupStep } from "@/lib/business/session-options";

type BusinessSessionStepperProps = {
  step: SetupStep;
};

export default function BusinessSessionStepper({ step }: BusinessSessionStepperProps) {
  const items: Array<{ id: SetupStep; label: string }> = [
    { id: 1, label: "Session basics" },
    { id: 2, label: "Game mode" },
    { id: 3, label: "Review" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-white/65">
        <span>Progress</span>
        <span>
          Step {step} of {items.length}
        </span>
      </div>
      <ol className="flex items-center justify-between gap-2">
      {items.map((item) => {
        const active = step === item.id;
        const complete = item.id < step;
        const badgeClasses = complete
          ? "border-emerald-300/80 bg-emerald-400/20 text-emerald-100"
          : active
            ? "border-slate-200/90 bg-slate-200/18 text-white"
            : "border-white/20 bg-white/5 text-white/70";

        return (
          <li key={item.id} className="flex flex-1 items-center gap-2">
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${badgeClasses}`}>
              {item.id}
            </span>
            <span className={`text-xs sm:text-sm ${active ? "text-white" : "text-white/75"}`}>{item.label}</span>
          </li>
        );
      })}
      </ol>
    </div>
  );
}
