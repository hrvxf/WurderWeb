import { useMemo, useState } from "react";

import type { ManagerInsight } from "@/components/business/dashboard/types";

type InsightCardsProps = {
  insights: ManagerInsight[];
};

type InsightGroupKey = "participation" | "claims_quality" | "operational" | "other";

function severityTone(severity: ManagerInsight["severity"]): string {
  if (severity === "critical") return "var(--mc-alert)";
  if (severity === "warning") return "var(--mc-warning)";
  return "var(--mc-primary)";
}

function formatMetricValue(metric: string, value: number): string {
  return metric.toLowerCase().includes("rate") ? `${(value * 100).toFixed(1)}%` : value.toLocaleString();
}

function formatInsightSubtext(insight: ManagerInsight): string | null {
  if (!insight.evidence || insight.evidence.length === 0) return null;
  return insight.evidence
    .map((entry) => {
      const actual = formatMetricValue(entry.metric, entry.actual);
      const expected = formatMetricValue(entry.metric, entry.expected);
      return `${entry.metric}: ${actual} (expected ${entry.comparator} ${expected})`;
    })
    .join(" | ");
}

function formatInsightValue(insight: ManagerInsight): string {
  if (insight.value == null) return "--";
  if (insight.unit === "ratio") return `${(insight.value * 100).toFixed(1)}%`;
  if (insight.unit === "ms") return `${insight.value.toLocaleString()} ms`;
  return insight.value.toLocaleString();
}

function groupLabel(key: InsightGroupKey): string {
  if (key === "participation") return "Participation";
  if (key === "claims_quality") return "Claims Quality";
  if (key === "operational") return "Operational";
  return "Other Signals";
}

function groupInsight(insight: ManagerInsight): InsightGroupKey {
  const label = insight.label.trim().toLowerCase();
  if (
    label.includes("join") ||
    label.includes("completion") ||
    label.includes("drop") ||
    label.includes("attendance") ||
    label.includes("active player")
  ) {
    return "participation";
  }
  if (
    label.includes("claim") ||
    label.includes("accuracy") ||
    label.includes("dispute") ||
    label.includes("confirm")
  ) {
    return "claims_quality";
  }
  if (
    label.includes("resolution") ||
    label.includes("alert") ||
    label.includes("anomaly") ||
    label.includes("timeline") ||
    label.includes("event")
  ) {
    return "operational";
  }
  return "other";
}

function isLowSignal(insight: ManagerInsight): boolean {
  if (insight.severity === "warning" || insight.severity === "critical") return false;
  const valueMissingOrZero = insight.value == null || !Number.isFinite(insight.value) || Math.abs(insight.value) < 0.000001;
  const hasEvidence = Array.isArray(insight.evidence) && insight.evidence.length > 0;
  const message = (insight.message ?? "").trim().toLowerCase();
  const hasRealMessage = message.length > 0 && !message.includes("signal captured");
  return valueMissingOrZero && !hasEvidence && !hasRealMessage;
}

export default function InsightCards({ insights }: InsightCardsProps) {
  const [showLowSignal, setShowLowSignal] = useState(false);
  const grouped = useMemo(() => {
    const rows = showLowSignal ? insights : insights.filter((insight) => !isLowSignal(insight));
    return rows.reduce<Record<InsightGroupKey, ManagerInsight[]>>(
      (acc, insight) => {
        const key = groupInsight(insight);
        acc[key].push(insight);
        return acc;
      },
      { participation: [], claims_quality: [], operational: [], other: [] }
    );
  }, [insights, showLowSignal]);

  const visibleCount = grouped.participation.length + grouped.claims_quality.length + grouped.operational.length + grouped.other.length;
  const hiddenCount = insights.length - visibleCount;

  return (
    <section className="mission-control__panel p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="mission-control__display text-lg font-semibold text-[var(--mc-text)]">KPI Radar</h2>
        <div className="flex items-center gap-3">
          <p className="mission-control__label">Signal Feed</p>
          <button
            type="button"
            className="mission-control__button"
            onClick={() => setShowLowSignal((current) => !current)}
          >
            {showLowSignal ? "Hide Low-Signal" : "Show Low-Signal"}
          </button>
        </div>
      </div>
      {visibleCount > 0 ? (
        <div className="mt-3 grid gap-3 border-t border-[var(--mc-border)] pt-2.5">
          {(Object.keys(grouped) as InsightGroupKey[]).map((groupKey) => {
            const items = grouped[groupKey];
            if (items.length === 0) return null;
            return (
              <section key={groupKey}>
                <p className="mission-control__label">{groupLabel(groupKey)}</p>
                <div className="mt-1 overflow-x-auto">
                  <table className="mission-control__table mission-control__table--compact min-w-full table-fixed">
                    <colgroup>
                      <col style={{ width: "38%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "48%" }} />
                    </colgroup>
                    <thead className="text-left text-xs uppercase tracking-wide text-[var(--mc-text-muted)]">
                      <tr>
                        <th>Signal</th>
                        <th>Value</th>
                        <th>Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((insight) => {
                        const subtext = formatInsightSubtext(insight);
                        const tone = severityTone(insight.severity);
                        return (
                          <tr key={insight.id}>
                            <td>
                              <span style={{ color: tone }} className="font-semibold">
                                {insight.label}
                              </span>
                            </td>
                            <td className="whitespace-nowrap font-semibold text-[var(--mc-text)]">{formatInsightValue(insight)}</td>
                            <td className="text-[var(--mc-text-soft)]">
                              {insight.message || subtext || `${insight.label} signal captured`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
          {hiddenCount > 0 && !showLowSignal ? (
            <p className="text-xs text-[var(--mc-text-muted)]">{hiddenCount} low-signal metrics hidden.</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 border-t border-[var(--mc-border)] pt-3 text-sm text-[var(--mc-text-soft)]">
          No insight metrics available yet for this session.
        </p>
      )}
    </section>
  );
}
