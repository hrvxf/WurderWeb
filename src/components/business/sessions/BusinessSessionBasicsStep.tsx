import { toBusinessSessionName } from "@/lib/business/session-payload-mapper";
import type { SetupState } from "@/lib/business/session-options";

type BusinessSessionBasicsStepProps = {
  setup: SetupState;
  onOrgNameChange: (value: string) => void;
  onSessionLabelChange: (value: string) => void;
};

export default function BusinessSessionBasicsStep({
  setup,
  onOrgNameChange,
  onSessionLabelChange,
}: BusinessSessionBasicsStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-white sm:text-lg">Session basics</h2>
        <p className="mt-1 text-sm text-white/70">Define the organisation context and the report label for this session.</p>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">Organisation name</label>
        <input
          className="input-dark py-2.5 text-sm"
          placeholder="e.g. Wurder"
          value={setup.orgName}
          onChange={(event) => onOrgNameChange(event.target.value)}
        />
        <p className="text-xs text-soft">Used to group sessions and reporting.</p>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">Session name (optional)</label>
        <input
          className="input-dark py-2.5 text-sm"
          placeholder="e.g. Q2 Team Offsite"
          value={setup.sessionLabel}
          onChange={(event) => onSessionLabelChange(event.target.value)}
        />
        <p className="text-xs text-soft">Helps identify this session in reports.</p>
        <p className="text-xs text-soft">If left empty, we will generate: {toBusinessSessionName(setup.orgName, "")}</p>
      </div>
    </div>
  );
}
