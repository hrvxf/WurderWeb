import BusinessSessionSummaryCard from "@/components/business/sessions/form/BusinessSessionSummaryCard";
import {
  freeForAllVariantOptions,
  gameModeOptions,
  guildWinConditionOptions,
  managerParticipationOptions,
  type SetupState,
} from "@/lib/business/session-options";

type BusinessSessionReviewStepProps = {
  setup: SetupState;
  resolvedSessionName: string;
};

export default function BusinessSessionReviewStep({ setup, resolvedSessionName }: BusinessSessionReviewStepProps) {
  const gameMode = gameModeOptions.find((item) => item.value === setup.gameMode)?.label ?? "--";
  const managerRole =
    managerParticipationOptions.find((item) => item.value === setup.managerParticipation)?.label ?? "--";
  const modeDetail =
    setup.gameMode === "free_for_all"
      ? freeForAllVariantOptions.find((item) => item.value === setup.freeForAllVariant)?.label
      : setup.gameMode === "guilds"
        ? guildWinConditionOptions.find((item) => item.value === setup.guildWinCondition)?.label
        : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white sm:text-lg">Review session</h2>
        <p className="mt-1 text-sm text-white/70">Confirm these details before starting the session.</p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <BusinessSessionSummaryCard label="Organisation" value={setup.orgName || "Not set"} />
        <BusinessSessionSummaryCard label="Session name" value={resolvedSessionName} />
        <BusinessSessionSummaryCard label="Game mode" value={gameMode} />
        {modeDetail ? <BusinessSessionSummaryCard label="Mode variant" value={modeDetail} /> : null}
        <BusinessSessionSummaryCard label="Session length" value={`${setup.length} minutes`} />
        <BusinessSessionSummaryCard label="Manager role" value={managerRole} />
      </dl>
    </div>
  );
}
