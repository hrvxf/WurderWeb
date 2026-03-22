import { toSessionName } from "@/lib/company-game/companyGamePayloadMapper";
import type { SetupState } from "@/lib/company-game/companyGameOptions";

type CreateSessionBasicsStepProps = {
  setup: SetupState;
  onOrgNameChange: (value: string) => void;
  onSessionLabelChange: (value: string) => void;
};

export default function CreateSessionBasicsStep({
  setup,
  onOrgNameChange,
  onSessionLabelChange,
}: CreateSessionBasicsStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-white sm:text-lg">Session basics</h2>
        <p className="mt-1 text-sm text-white/70">Define the organisation context and the report label for this session.</p>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">Organisation name</label>
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2.5 text-sm outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/15"
          placeholder="e.g. Wurder"
          value={setup.orgName}
          onChange={(event) => onOrgNameChange(event.target.value)}
        />
        <p className="text-xs text-soft">Used to group sessions and reporting.</p>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">Session name (optional)</label>
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2.5 text-sm outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/15"
          placeholder="e.g. Q2 Team Offsite"
          value={setup.sessionLabel}
          onChange={(event) => onSessionLabelChange(event.target.value)}
        />
        <p className="text-xs text-soft">Helps identify this session in reports.</p>
        <p className="text-xs text-soft">If left empty, we will generate: {toSessionName(setup.orgName, "")}</p>
      </div>
    </div>
  );
}
