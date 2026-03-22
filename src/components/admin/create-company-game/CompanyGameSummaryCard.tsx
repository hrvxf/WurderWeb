type CompanyGameSummaryCardProps = {
  label: string;
  value: string;
};

export default function CompanyGameSummaryCard({ label, value }: CompanyGameSummaryCardProps) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2.5">
      <dt className="text-white/70">{label}</dt>
      <dd className="mt-1 font-medium text-white">{value}</dd>
    </div>
  );
}
