"use client";

import { FormEvent, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";

type CreateResult = {
  gameCode: string;
  orgId: string;
  templateId: string;
};

const defaultForm = {
  orgName: "",
  templateName: "",
  mode: "classic",
  durationMinutes: 20,
  wordDifficulty: "medium",
  teamsEnabled: false,
  metricsEnabled: "",
  minSecondsBeforeClaim: 0,
  minSecondsBetweenClaims: 0,
  maxActiveClaimsPerPlayer: 1,
  freeRefreshCooldownSeconds: 0,
};

export default function CreateCompanyGamePage() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState(defaultForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  const metricsList = useMemo(
    () =>
      form.metricsEnabled
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [form.metricsEnabled]
  );

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          metricsEnabled: metricsList,
          minSecondsBeforeClaim: Number(form.minSecondsBeforeClaim),
          minSecondsBetweenClaims: Number(form.minSecondsBetweenClaims),
          maxActiveClaimsPerPlayer: Number(form.maxActiveClaimsPerPlayer),
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

  return (
    <section className="glass-surface rounded-3xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Create Company Game</h1>
      <p className="text-soft">Create an organization, template, and company game code in one action.</p>

      <form className="space-y-3" onSubmit={(event) => void submitForm(event)}>
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          placeholder="Org name"
          value={form.orgName}
          onChange={(event) => setForm((prev) => ({ ...prev, orgName: event.target.value }))}
          required
        />
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          placeholder="Template name"
          value={form.templateName}
          onChange={(event) => setForm((prev) => ({ ...prev, templateName: event.target.value }))}
          required
        />
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          placeholder="Mode"
          value={form.mode}
          onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value }))}
          required
        />
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          type="number"
          min={1}
          placeholder="Duration (minutes)"
          value={form.durationMinutes}
          onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value || 0) }))}
          required
        />
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          placeholder="Word difficulty"
          value={form.wordDifficulty}
          onChange={(event) => setForm((prev) => ({ ...prev, wordDifficulty: event.target.value }))}
          required
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.teamsEnabled}
            onChange={(event) => setForm((prev) => ({ ...prev, teamsEnabled: event.target.checked }))}
          />
          Teams enabled
        </label>
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          placeholder="Metrics enabled (comma-separated)"
          value={form.metricsEnabled}
          onChange={(event) => setForm((prev) => ({ ...prev, metricsEnabled: event.target.value }))}
        />
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          type="number"
          min={0}
          step={1}
          placeholder="Min seconds before claim"
          value={form.minSecondsBeforeClaim}
          onChange={(event) => setForm((prev) => ({ ...prev, minSecondsBeforeClaim: Number(event.target.value || 0) }))}
          required
        />
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          type="number"
          min={0}
          step={1}
          placeholder="Min seconds between claims"
          value={form.minSecondsBetweenClaims}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, minSecondsBetweenClaims: Number(event.target.value || 0) }))
          }
          required
        />
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          type="number"
          min={1}
          step={1}
          placeholder="Max active claims per player"
          value={form.maxActiveClaimsPerPlayer}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, maxActiveClaimsPerPlayer: Number(event.target.value || 0) }))
          }
          required
        />
        <input
          className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          type="number"
          min={0}
          step={1}
          placeholder="Free refresh cooldown (seconds)"
          value={form.freeRefreshCooldownSeconds}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, freeRefreshCooldownSeconds: Number(event.target.value || 0) }))
          }
          required
        />

        <button className="rounded-xl border border-white/30 px-4 py-2" type="submit" disabled={busy || loading || !user}>
          {busy ? "Creating..." : "Create company game"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-200">{error}</p> : null}

      {result ? (
        <div className="rounded-xl border border-white/20 p-3 space-y-2 text-sm">
          <div>gameCode: {result.gameCode}</div>
          <div>orgId: {result.orgId}</div>
          <div>templateId: {result.templateId}</div>
          <button
            type="button"
            className="rounded-xl border border-white/30 px-3 py-1"
            onClick={() => void navigator.clipboard.writeText(result.gameCode)}
          >
            Copy gameCode
          </button>
        </div>
      ) : null}
    </section>
  );
}
