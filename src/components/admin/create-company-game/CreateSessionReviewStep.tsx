import CompanyGameSummaryCard from "@/components/admin/create-company-game/CompanyGameSummaryCard";
import {
  gameModeOptions,
  managerParticipationOptions,
  type SetupState,
} from "@/lib/company-game/companyGameOptions";

type CreateSessionReviewStepProps = {
  setup: SetupState;
  resolvedSessionName: string;
};

export default function CreateSessionReviewStep({ setup, resolvedSessionName }: CreateSessionReviewStepProps) {
  const gameMode = gameModeOptions.find((item) => item.value === setup.gameMode)?.label ?? "--";
  const managerRole =
    managerParticipationOptions.find((item) => item.value === setup.managerParticipation)?.label ?? "--";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white sm:text-lg">Review session</h2>
        <p className="mt-1 text-sm text-white/70">Confirm these details before starting the session.</p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <CompanyGameSummaryCard label="Organisation" value={setup.orgName || "Not set"} />
        <CompanyGameSummaryCard label="Session name" value={resolvedSessionName} />
        <CompanyGameSummaryCard label="Game mode" value={gameMode} />
        <CompanyGameSummaryCard label="Session length" value={`${setup.length} minutes`} />
        <CompanyGameSummaryCard label="Manager role" value={managerRole} />
      </dl>
    </div>
  );
}
