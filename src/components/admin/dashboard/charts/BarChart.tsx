type BarDatum = {
  id: string;
  label: string;
  value: number;
  valueLabel: string;
};

type BarChartProps = {
  data: BarDatum[];
};

export default function BarChart({ data }: BarChartProps) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.id}>
          <div className="flex items-center justify-between gap-2 text-xs text-white/70">
            <span className="truncate">{item.label}</span>
            <span className="font-medium text-white">{item.valueLabel}</span>
          </div>
          <div className="mt-1 h-2 rounded bg-white/10">
            <div
              className="h-2 rounded"
              style={{
                width: `${Math.max(4, (item.value / max) * 100)}%`,
                background: "linear-gradient(90deg, var(--manager-accent, #D96A5A), #7C92C8)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
