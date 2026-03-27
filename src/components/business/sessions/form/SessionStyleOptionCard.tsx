type SessionStyleOptionCardProps = {
  selected: boolean;
  label: string;
  description?: string;
  onClick: () => void;
};

export default function SessionStyleOptionCard({
  selected,
  label,
  description,
  onClick,
}: SessionStyleOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition duration-150 ${
        selected
          ? "border-slate-100/80 bg-slate-100/12 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.14)]"
          : "border-white/20 bg-white/[0.02] text-white/85 hover:-translate-y-px hover:border-white/35 hover:bg-white/[0.06]"
      }`}
    >
      <span className="block">{label}</span>
      {description ? <span className="mt-1.5 block text-xs text-white/65">{description}</span> : null}
    </button>
  );
}
