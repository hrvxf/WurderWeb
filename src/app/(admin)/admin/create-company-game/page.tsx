"use client";

import { FormEvent, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";

type CreateResult = {
  gameCode: string;
  orgId: string;
  templateId: string;
};

type ModeOption = {
  value: "classic" | "elimination" | "guilds";
  label: string;
  description: string;
};

type DurationPreset = {
  value: number;
  label: string;
};

type DifficultyOption = "easy" | "medium" | "hard";

type MetricOption = {
  value: string;
  label: string;
};

type FormState = {
  orgName: string;
  templateName: string;
  mode: ModeOption["value"];
  durationMinutes: number;
  durationPreset: string;
  wordDifficulty: DifficultyOption;
  teamsEnabled: boolean;
  metricsEnabled: string[];
  minSecondsBeforeClaim: number;
  minSecondsBetweenClaims: number;
  freeRefreshCooldownSeconds: number;
};

const modeOptions: ModeOption[] = [
  { value: "classic", label: "Classic", description: "Standard flow with straightforward elimination and scoring." },
  { value: "elimination", label: "Elimination", description: "Players are gradually removed until only a few remain." },
  { value: "guilds", label: "Guilds", description: "Team-based play that emphasizes collaboration and coordination." },
];

const durationPresets: DurationPreset[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
];

const metricOptions: MetricOption[] = [
  { value: "successRate", label: "successRate" },
  { value: "disputeRate", label: "disputeRate" },
  { value: "avgResolutionTimeMs", label: "avgResolutionTimeMs" },
  { value: "cleanKillRatio", label: "cleanKillRatio" },
  { value: "persuasionScore", label: "persuasionScore" },
  { value: "subtletyScore", label: "subtletyScore" },
  { value: "closingScore", label: "closingScore" },
  { value: "resilienceScore", label: "resilienceScore" },
];

const defaultForm: FormState = {
  orgName: "",
  templateName: "",
  mode: "classic",
  durationMinutes: 30,
  durationPreset: "30",
  wordDifficulty: "medium",
  teamsEnabled: false,
  metricsEnabled: ["successRate", "disputeRate", "avgResolutionTimeMs", "cleanKillRatio"],
  minSecondsBeforeClaim: 0,
  minSecondsBetweenClaims: 0,
  freeRefreshCooldownSeconds: 0,
};

function fieldError(form: FormState) {
  return {
    orgName: form.orgName.trim() ? "" : "Organization name is required.",
    templateName: form.templateName.trim() ? "" : "Template name is required.",
    durationMinutes:
      Number.isFinite(form.durationMinutes) && form.durationMinutes >= 1 ? "" : "Session duration must be at least 1 minute.",
    minSecondsBeforeClaim:
      Number.isFinite(form.minSecondsBeforeClaim) && form.minSecondsBeforeClaim >= 0
        ? ""
        : "Minimum time before first claim cannot be negative.",
    minSecondsBetweenClaims:
      Number.isFinite(form.minSecondsBetweenClaims) && form.minSecondsBetweenClaims >= 0
        ? ""
        : "Cooldown between claims cannot be negative.",
    freeRefreshCooldownSeconds:
      Number.isFinite(form.freeRefreshCooldownSeconds) && form.freeRefreshCooldownSeconds >= 0
        ? ""
        : "Refresh cooldown cannot be negative.",
  };
}

function InputMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-200">{message}</p>;
}

export default function CreateCompanyGamePage() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [showAdvancedHelp, setShowAdvancedHelp] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = fieldError(form);
  const hasError = Object.values(errors).some(Boolean);

  const selectedMode = modeOptions.find((option) => option.value === form.mode);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (hasError) {
      setError("Please fix the highlighted fields before creating the game.");
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      if (!user) {
        throw new Error("You must be signed in.");
      }

      const token = await user.getIdToken();
      const response = await fetch("/api/admin/create-company-game", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          orgName: form.orgName,
          templateName: form.templateName,
          mode: form.mode,
          durationMinutes: Number(form.durationMinutes),
          wordDifficulty: form.wordDifficulty,
          teamsEnabled: form.teamsEnabled,
          metricsEnabled: form.metricsEnabled,
          minSecondsBeforeClaim: Number(form.minSecondsBeforeClaim),
          minSecondsBetweenClaims: Number(form.minSecondsBetweenClaims),
          freeRefreshCooldownSeconds: Number(form.freeRefreshCooldownSeconds),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<CreateResult> & { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to create company game.");
      }

      setResult({
        gameCode: String(payload.gameCode ?? ""),
        orgId: String(payload.orgId ?? ""),
        templateId: String(payload.templateId ?? ""),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create company game.");
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setForm(defaultForm);
    setSubmitted(false);
    setError(null);
    setResult(null);
  }

  function toggleMetric(metric: string) {
    setForm((prev) => {
      const alreadyEnabled = prev.metricsEnabled.includes(metric);
      return {
        ...prev,
        metricsEnabled: alreadyEnabled
          ? prev.metricsEnabled.filter((item) => item !== metric)
          : [...prev.metricsEnabled, metric],
      };
    });
  }

  const summaryRows = useMemo(
    () => [
      ["Organization", form.orgName || "—"],
      ["Template", form.templateName || "—"],
      ["Mode", selectedMode?.label ?? form.mode],
      ["Duration", `${form.durationMinutes} min`],
      ["Difficulty", form.wordDifficulty],
      ["Teams", form.teamsEnabled ? "Enabled" : "Disabled"],
      ["Metrics", `${form.metricsEnabled.length} selected`],
      ["Min before claim", `${form.minSecondsBeforeClaim}s`],
      ["Claim cooldown", `${form.minSecondsBetweenClaims}s`],
      ["Refresh cooldown", `${form.freeRefreshCooldownSeconds}s`],
    ],
    [form, selectedMode?.label]
  );

  if (result) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Create Company Game</h1>
          <p className="text-soft">Create an organization, reusable template, and company game code in one step.</p>
        </header>

        <section className="glass-surface rounded-3xl border border-emerald-400/30 p-6 md:p-8">
          <div className="space-y-3">
            <p className="text-sm font-medium text-emerald-200">Success</p>
            <h2 className="text-xl font-semibold">Company game created</h2>
            <div className="rounded-2xl border border-white/20 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-soft">Game code</p>
              <p className="mt-1 text-3xl font-bold tracking-widest">{result.gameCode}</p>
              <button
                type="button"
                className="mt-3 rounded-xl border border-white/30 px-3 py-2 text-sm hover:bg-white/10"
                onClick={() => void navigator.clipboard.writeText(result.gameCode)}
              >
                Copy code
              </button>
            </div>
            <p className="text-xs text-soft">orgId: {result.orgId}</p>
            <p className="text-xs text-soft">templateId: {result.templateId}</p>
            <div className="flex flex-wrap gap-3 pt-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/30 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Create another game
              </button>
              <a href="/admin" className="rounded-xl border border-white/20 px-4 py-2 text-sm text-soft hover:bg-white/10">
                Back to Admin
              </a>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Create Company Game</h1>
        <p className="text-soft">Create an organization, reusable template, and company game code in one step.</p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-300/50 bg-red-950/50 px-4 py-3 text-sm text-red-100">{error}</div>
      ) : null}

      <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={(event) => void submitForm(event)}>
        <div className="space-y-6">
          <section className="glass-surface rounded-3xl p-5 md:p-6">
            <h2 className="text-lg font-semibold">Organization</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Organization name</label>
                <input
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                  placeholder="Acme Corp"
                  value={form.orgName}
                  onChange={(event) => setForm((prev) => ({ ...prev, orgName: event.target.value }))}
                  required
                />
                <InputMessage message={submitted ? errors.orgName : ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Template name</label>
                <input
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                  placeholder="Q2 Sales Onboarding"
                  value={form.templateName}
                  onChange={(event) => setForm((prev) => ({ ...prev, templateName: event.target.value }))}
                  required
                />
                <p className="mt-1 text-xs text-soft">Save a reusable setup for future company sessions.</p>
                <InputMessage message={submitted ? errors.templateName : ""} />
              </div>
            </div>
          </section>

          <section className="glass-surface rounded-3xl p-5 md:p-6">
            <h2 className="text-lg font-semibold">Session Setup</h2>
            <div className="mt-4 space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium">Game mode</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {modeOptions.map((option) => {
                    const isActive = form.mode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, mode: option.value }))}
                        className={`rounded-2xl border p-4 text-left transition ${
                          isActive ? "border-emerald-300 bg-emerald-500/20" : "border-white/20 hover:bg-white/10"
                        }`}
                      >
                        <p className="font-semibold">{option.label}</p>
                        <p className="mt-1 text-xs text-soft">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Session duration</label>
                  <select
                    className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                    value={form.durationPreset}
                    onChange={(event) => {
                      const nextPreset = event.target.value;
                      setForm((prev) => ({
                        ...prev,
                        durationPreset: nextPreset,
                        durationMinutes: nextPreset === "custom" ? prev.durationMinutes : Number(nextPreset),
                      }));
                    }}
                  >
                    {durationPresets.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                  {form.durationPreset === "custom" ? (
                    <div className="mt-2">
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                        value={form.durationMinutes}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value || 0) }))
                        }
                      />
                      <InputMessage message={submitted ? errors.durationMinutes : ""} />
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Word difficulty</label>
                  <select
                    className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                    value={form.wordDifficulty}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, wordDifficulty: event.target.value as DifficultyOption }))
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Teams enabled</p>
                    <p className="text-xs text-soft">Turn on team-based structure for this game.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.teamsEnabled}
                    onClick={() => setForm((prev) => ({ ...prev, teamsEnabled: !prev.teamsEnabled }))}
                    className={`relative h-7 w-12 rounded-full transition ${
                      form.teamsEnabled ? "bg-emerald-500" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                        form.teamsEnabled ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-2 text-xs text-emerald-200">
                  {form.teamsEnabled ? "Team-based structure is enabled." : "Players will participate individually."}
                </p>
              </div>
            </div>
          </section>

          <section className="glass-surface rounded-3xl p-5 md:p-6">
            <h2 className="text-lg font-semibold">Metrics & Insights</h2>
            <p className="mt-1 text-xs text-soft">Choose which performance signals to track for this session.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {metricOptions.map((metric) => {
                const selected = form.metricsEnabled.includes(metric.value);
                return (
                  <button
                    key={metric.value}
                    type="button"
                    onClick={() => toggleMetric(metric.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      selected ? "border-emerald-300 bg-emerald-500/20" : "border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {metric.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-soft">Some metrics may be collected now even if only a subset is currently used downstream.</p>
          </section>

          <section className="glass-surface rounded-3xl p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Advanced Training Rules</h2>
              <button
                type="button"
                onClick={() => setShowAdvancedHelp((prev) => !prev)}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
              >
                {showAdvancedHelp ? "Hide guidance" : "What do these control?"}
              </button>
            </div>
            {showAdvancedHelp ? (
              <p className="mt-2 rounded-xl border border-white/20 bg-black/20 p-3 text-xs text-soft">
                These settings shape claim pacing, focus, and target refreshing behavior. Start with defaults, then adjust
                based on coaching goals.
              </p>
            ) : null}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Minimum time before first claim</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                  value={form.minSecondsBeforeClaim}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, minSecondsBeforeClaim: Number(event.target.value || 0) }))
                  }
                />
                <p className="mt-1 text-xs text-soft">Forces players to engage before claiming.</p>
                <InputMessage message={submitted ? errors.minSecondsBeforeClaim : ""} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Cooldown between claims</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                  value={form.minSecondsBetweenClaims}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, minSecondsBetweenClaims: Number(event.target.value || 0) }))
                  }
                />
                <p className="mt-1 text-xs text-soft">Prevents rapid back-to-back claims.</p>
                <InputMessage message={submitted ? errors.minSecondsBetweenClaims : ""} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Refresh cooldown</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                  value={form.freeRefreshCooldownSeconds}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, freeRefreshCooldownSeconds: Number(event.target.value || 0) }))
                  }
                />
                <p className="mt-1 text-xs text-soft">Stops players from refreshing too often to avoid difficult targets.</p>
                <InputMessage message={submitted ? errors.freeRefreshCooldownSeconds : ""} />
              </div>
            </div>
          </section>

          <section className="glass-surface rounded-3xl p-5 md:p-6">
            <h2 className="text-lg font-semibold">Review / Create</h2>
            <p className="mt-1 text-sm text-soft">Review your setup, then create the organization, template, and game code.</p>
            <button
              className="mt-4 rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={busy || loading || !user || hasError}
            >
              {busy ? "Creating..." : "Create company game"}
            </button>
          </section>
        </div>

        <aside className="glass-surface h-fit rounded-3xl p-5 md:sticky md:top-6">
          <h2 className="text-lg font-semibold">Live Review</h2>
          <dl className="mt-4 space-y-2 text-sm">
            {summaryRows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-white/10 pb-2">
                <dt className="text-soft">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </form>
    </div>
  );
}
