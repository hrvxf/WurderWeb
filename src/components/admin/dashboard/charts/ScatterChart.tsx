type ScatterDatum = {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
};

type ScatterChartProps = {
  data: ScatterDatum[];
  onPointClick?: (id: string) => void;
};

export default function ScatterChart({ data, onPointClick }: ScatterChartProps) {
  const width = 360;
  const height = 220;
  const padding = 24;
  const maxX = Math.max(1, ...data.map((d) => d.x));
  const maxY = Math.max(1, ...data.map((d) => d.y));
  const maxSize = Math.max(1, ...data.map((d) => d.size));

  const toX = (value: number) => padding + (value / maxX) * (width - padding * 2);
  const toY = (value: number) => height - padding - (value / maxY) * (height - padding * 2);
  const toR = (value: number) => 4 + (value / maxSize) * 8;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="surface-panel-muted h-56 w-full">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#7f8aa1" strokeWidth="1" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#7f8aa1" strokeWidth="1" />
      {data.map((point) => (
        <g key={point.id}>
          <circle
            cx={toX(point.x)}
            cy={toY(point.y)}
            r={toR(point.size)}
            fill="var(--manager-accent, #D96A5A)"
            fillOpacity="0.75"
            className={onPointClick ? "cursor-pointer hover:fill-[#7C92C8]" : ""}
            onClick={onPointClick ? () => onPointClick(point.id) : undefined}
          />
          <title>{`${point.label} | accuracy ${(point.x * 100).toFixed(1)}% | K/D ${point.y.toFixed(2)}`}</title>
        </g>
      ))}
      <text x={width / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="#a6b0c3">
        Accuracy Ratio
      </text>
      <text x={10} y={height / 2} textAnchor="middle" fontSize="11" fill="#a6b0c3" transform={`rotate(-90 10 ${height / 2})`}>
        K/D Ratio
      </text>
    </svg>
  );
}
