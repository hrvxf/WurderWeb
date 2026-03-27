import SessionStyleOptionCard from "@/components/business/sessions/form/SessionStyleOptionCard";
import {
  gameModeOptions,
  lengthOptions,
  managerParticipationOptions,
  type GameModeOption,
  type GameModeValue,
  type ManagerParticipationValue,
  type SessionLength,
} from "@/lib/business/session-options";

type BusinessSessionSetupStepProps = {
  gameMode: GameModeValue;
  length: SessionLength;
  managerParticipation: ManagerParticipationValue;
  onGameModeChange: (value: GameModeValue) => void;
  onLengthChange: (value: SessionLength) => void;
  onManagerParticipationChange: (value: ManagerParticipationValue) => void;
};

export default function BusinessSessionSetupStep({
  gameMode,
  length,
  managerParticipation,
  onGameModeChange,
  onLengthChange,
  onManagerParticipationChange,
}: BusinessSessionSetupStepProps) {
  const selectedMode = gameModeOptions.find((option) => option.value === gameMode) ?? gameModeOptions[0];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-white sm:text-lg">Session setup</h2>
        <p className="mt-1 text-sm text-white/70">Choose the mode, session length, and how the manager participates.</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-white">Game mode</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {gameModeOptions.map((option) => (
            <SessionStyleOptionCard
              key={option.value}
              label={option.label}
              selected={gameMode === option.value}
              onClick={() => onGameModeChange(option.value)}
            />
          ))}
        </div>
      </div>

      <ModeDescriptionPanel option={selectedMode} />

      <div className="space-y-3">
        <p className="text-sm font-medium text-white">Session length</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {lengthOptions.map((minutes) => (
            <SessionStyleOptionCard
              key={minutes}
              label={`${minutes} minutes`}
              selected={length === minutes}
              onClick={() => onLengthChange(minutes)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-white">Manager role</p>
        <div className="grid gap-2">
          {managerParticipationOptions.map((option) => (
            <SessionStyleOptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={managerParticipation === option.value}
              onClick={() => onManagerParticipationChange(option.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModeDescriptionPanel({ option }: { option: GameModeOption }) {
  return (
    <aside className="surface-panel p-4 sm:p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-white/70">Game mode overview</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{option.label}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/85">{option.practicalDescription}</p>
      <p className="mt-2 text-sm leading-relaxed text-white/80">{option.interactionDescription}</p>

      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/70">Best suited to</p>
      <ul className="mt-2 space-y-1.5 text-sm text-white/85">
        {option.businessUseCases.map((useCase) => (
          <li key={useCase}>- {useCase}</li>
        ))}
      </ul>

      <p className="surface-panel-muted mt-4 px-3 py-2 text-xs text-white/75">
        {option.analyticsNote}
      </p>
    </aside>
  );
}
