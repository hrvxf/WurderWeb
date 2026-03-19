"use client";

import { FormEvent, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";

type ModeValue = "classic" | "elimination" | "guilds";
type DifficultyValue = "easy" | "medium" | "hard";

type FormState = {
  orgName: string;
  companyLogoUrl: string;
  brandAccentColor: string;
  brandThemeLabel: string;
  orgId?: string;
  templateName: string;
  selectedTemplateId: string;
  mode: ModeValue;
  durationMinutes: number;
  wordDifficulty: DifficultyValue;
  teamsEnabled: boolean;
  metricsEnabled: string[];
  minSecondsBeforeClaim: number;
  minSecondsBetweenClaims: number;
  freeRefreshCooldownSeconds: number;
};

type SavedTemplate = {
  templateId: string;
  name: string;
  config: {
    mode: string;
    durationMinutes: number;
    wordDifficulty: string;
    teamsEnabled: boolean;
  };
  metricsEnabled: string[];
  managerDefaults: {
    minSecondsBeforeClaim: number;
    minSecondsBetweenClaims: number;
    maxActiveClaimsPerPlayer: number;
    freeRefreshCooldownSeconds: number;
  };
};

const metricOptions = [
  "successRate",
  "disputeRate",
  "avgResolutionTimeMs",
  "cleanKillRatio",
  "persuasionScore",
  "subtletyScore",
  "closingScore",
  "resilienceScore",
];

const defaultForm: FormState = {
  orgName: "",
  companyLogoUrl: "",
  brandAccentColor: "",
  brandThemeLabel: "",
  orgId: undefined,
  templateName: "",
  selectedTemplateId: "",
  mode: "classic",
  durationMinutes: 30,
  wordDifficulty: "medium",
  teamsEnabled: false,
  metricsEnabled: ["successRate", "disputeRate", "avgResolutionTimeMs", "cleanKillRatio"],
  minSecondsBeforeClaim: 0,
  minSecondsBetweenClaims: 0,
  freeRefreshCooldownSeconds: 0,
};

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTemplatesPayload(payload: unknown): {
  orgId: string | null;
  code?: string;
  tier?: string;
  entitlements?: { templateReuse?: boolean };
  templates: SavedTemplate[];
  message?: string;
} {
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const templatesRaw = Array.isArray(data.templates) ? data.templates : [];

  const templates = templatesRaw
    .map((entry) => {
      const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const config = row.config && typeof row.config === "object" ? (row.config as Record<string, unknown>) : {};
      const managerDefaults =
        row.managerDefaults && typeof row.managerDefaults === "object"
          ? (row.managerDefaults as Record<string, unknown>)
          : {};
      const templateId = typeof row.templateId === "string" ? row.templateId.trim() : "";
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!templateId || !name) return null;

      return {
        templateId,
        name,
        config: {
          mode: typeof config.mode === "string" ? config.mode : "classic",
          durationMinutes: asNumber(config.durationMinutes, 30),
          wordDifficulty: typeof config.wordDifficulty === "string" ? config.wordDifficulty : "medium",
          teamsEnabled: Boolean(config.teamsEnabled),
        },
        metricsEnabled: Array.isArray(row.metricsEnabled)
          ? row.metricsEnabled.filter((item): item is string => typeof item === "string")
          : [],
        managerDefaults: {
          minSecondsBeforeClaim: asNumber(managerDefaults.minSecondsBeforeClaim, 0),
          minSecondsBetweenClaims: asNumber(managerDefaults.minSecondsBetweenClaims, 0),
          maxActiveClaimsPerPlayer: asNumber(managerDefaults.maxActiveClaimsPerPlayer, 1),
          freeRefreshCooldownSeconds: asNumber(managerDefaults.freeRefreshCooldownSeconds, 0),
        },
      } satisfies SavedTemplate;
    })
    .filter((item): item is SavedTemplate => Boolean(item));

  return {
    orgId: typeof data.orgId === "string" ? data.orgId : null,
    code: typeof data.code === "string" ? data.code : undefined,
    tier: typeof data.tier === "string" ? data.tier : undefined,
    entitlements:
      data.entitlements && typeof data.entitlements === "object"
        ? (data.entitlements as { templateReuse?: boolean })
        : undefined,
    templates,
    message: typeof data.message === "string" ? data.message : undefined,
  };
}

export default function CreateCompanyGamePage() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [busy, setBusy] = useState(false);
  const [templatesBusy, setTemplatesBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [templateReuseAvailable, setTemplateReuseAvailable] = useState(true);
  const [result, setResult] = useState<{ gameCode: string; orgId: string; templateId: string | null } | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.templateId === form.selectedTemplateId) ?? null,
    [form.selectedTemplateId, templates]
  );

  async function loadTemplates() {
    if (!user) return setMessage("Sign in before loading templates.");
    if (!form.orgName.trim()) return setMessage("Enter organization name first.");

    setTemplatesBusy(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/company-templates?orgName=${encodeURIComponent(form.orgName.trim())}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const payload = normalizeTemplatesPayload(await response.json().catch(() => ({})));
      if (response.status === 403 && payload.code === "FEATURE_LOCKED") {
        setTemplateReuseAvailable(false);
        setTemplates([]);
        return setMessage(payload.message ?? "Template reuse is not available on your tier.");
      }
      if (!response.ok) throw new Error(payload.message ?? "Unable to load templates.");
      setTemplateReuseAvailable(payload.entitlements?.templateReuse !== false);
      setTemplates(payload.templates);
      setForm((prev) => ({ ...prev, orgId: payload.orgId ?? undefined }));
      setMessage(payload.templates.length > 0 ? `Loaded ${payload.templates.length} templates.` : "No saved templates yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load templates.");
    } finally {
      setTemplatesBusy(false);
    }
  }

  async function saveTemplate() {
    if (!user) return setMessage("Sign in before saving template.");
    if (!form.orgName.trim()) return setMessage("Organization name is required.");
    if (!form.templateName.trim()) return setMessage("Template name is required.");

    setTemplatesBusy(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/company-templates", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          orgId: form.orgId,
          orgName: form.orgName,
          templateName: form.templateName,
          mode: form.mode,
          durationMinutes: form.durationMinutes,
          wordDifficulty: form.wordDifficulty,
          teamsEnabled: form.teamsEnabled,
          metricsEnabled: form.metricsEnabled,
          minSecondsBeforeClaim: form.minSecondsBeforeClaim,
          minSecondsBetweenClaims: form.minSecondsBetweenClaims,
          maxActiveClaimsPerPlayer: 1,
          freeRefreshCooldownSeconds: form.freeRefreshCooldownSeconds,
        }),
      });
      const payload = normalizeTemplatesPayload(await response.json().catch(() => ({})));
      if (response.status === 403 && payload.code === "FEATURE_LOCKED") {
        setTemplateReuseAvailable(false);
        return setMessage(payload.message ?? "Template reuse is not available on your tier.");
      }
      if (!response.ok) throw new Error(payload.message ?? "Unable to save template.");
      await loadTemplates();
      setMessage("Template saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save template.");
    } finally {
      setTemplatesBusy(false);
    }
  }

  function applyTemplate() {
    if (!selectedTemplate) return;
    setForm((prev) => ({
      ...prev,
      mode: (["classic", "elimination", "guilds"].includes(selectedTemplate.config.mode)
        ? selectedTemplate.config.mode
        : prev.mode) as ModeValue,
      durationMinutes: selectedTemplate.config.durationMinutes,
      wordDifficulty: (["easy", "medium", "hard"].includes(selectedTemplate.config.wordDifficulty)
        ? selectedTemplate.config.wordDifficulty
        : prev.wordDifficulty) as DifficultyValue,
      teamsEnabled: selectedTemplate.config.teamsEnabled,
      metricsEnabled: selectedTemplate.metricsEnabled.length > 0 ? selectedTemplate.metricsEnabled : prev.metricsEnabled,
      minSecondsBeforeClaim: selectedTemplate.managerDefaults.minSecondsBeforeClaim,
      minSecondsBetweenClaims: selectedTemplate.managerDefaults.minSecondsBetweenClaims,
      freeRefreshCooldownSeconds: selectedTemplate.managerDefaults.freeRefreshCooldownSeconds,
    }));
    setMessage(`Applied template: ${selectedTemplate.name}`);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return setMessage("Sign in before creating company game.");
    if (!form.orgName.trim()) return setMessage("Organization name is required.");
    if (!form.selectedTemplateId && !form.templateName.trim()) return setMessage("Template name is required.");

    setBusy(true);
    setMessage(null);
    setResult(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/create-company-game", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          orgId: form.orgId,
          orgName: form.orgName,
          companyLogoUrl: form.companyLogoUrl || undefined,
          brandAccentColor: form.brandAccentColor || undefined,
          brandThemeLabel: form.brandThemeLabel || undefined,
          templateId: templateReuseAvailable ? form.selectedTemplateId || undefined : undefined,
          templateName: form.templateName,
          saveTemplate: templateReuseAvailable ? !form.selectedTemplateId : false,
          mode: form.mode,
          durationMinutes: form.durationMinutes,
          wordDifficulty: form.wordDifficulty,
          teamsEnabled: form.teamsEnabled,
          metricsEnabled: form.metricsEnabled,
          minSecondsBeforeClaim: form.minSecondsBeforeClaim,
          minSecondsBetweenClaims: form.minSecondsBetweenClaims,
          maxActiveClaimsPerPlayer: 1,
          freeRefreshCooldownSeconds: form.freeRefreshCooldownSeconds,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        code?: string;
        message?: string;
        gameCode?: string;
        orgId?: string;
        templateId?: string | null;
      };
      if (response.status === 403 && payload.code === "FEATURE_LOCKED") {
        setTemplateReuseAvailable(false);
      }
      if (!response.ok) throw new Error(payload.message ?? "Failed to create company game.");
      setResult({
        gameCode: String(payload.gameCode ?? ""),
        orgId: String(payload.orgId ?? ""),
        templateId: payload.templateId == null ? null : String(payload.templateId),
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create company game.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4">
      <h1 className="text-2xl font-semibold">Create Company Game</h1>
      {message ? <p className="rounded border border-white/20 bg-black/20 p-3 text-sm">{message}</p> : null}
      {result ? (
        <div className="rounded border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm">
          Created game <strong>{result.gameCode}</strong> for org <strong>{result.orgId}</strong>. templateId:{" "}
          {result.templateId ?? "(existing template reused)"}
        </div>
      ) : null}

      <form className="space-y-4 rounded border border-white/20 bg-black/20 p-4" onSubmit={(event) => void submitForm(event)}>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded border border-white/20 bg-black/20 px-3 py-2"
            placeholder="Organization name"
            value={form.orgName}
            onChange={(event) => setForm((prev) => ({ ...prev, orgName: event.target.value, orgId: undefined }))}
          />
          <input
            className="rounded border border-white/20 bg-black/20 px-3 py-2"
            placeholder="Company logo URL (optional)"
            value={form.companyLogoUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, companyLogoUrl: event.target.value }))}
          />
          <input
            className="rounded border border-white/20 bg-black/20 px-3 py-2"
            placeholder="Brand accent color (optional, #RRGGBB)"
            value={form.brandAccentColor}
            onChange={(event) => setForm((prev) => ({ ...prev, brandAccentColor: event.target.value }))}
          />
          <input
            className="rounded border border-white/20 bg-black/20 px-3 py-2"
            placeholder="Brand theme label (optional)"
            value={form.brandThemeLabel}
            onChange={(event) => setForm((prev) => ({ ...prev, brandThemeLabel: event.target.value }))}
          />
          <input
            className="rounded border border-white/20 bg-black/20 px-3 py-2"
            placeholder="Template name"
            value={form.templateName}
            onChange={(event) => setForm((prev) => ({ ...prev, templateName: event.target.value }))}
          />
        </div>

        {templateReuseAvailable ? (
          <>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded border border-white/30 px-3 py-2 text-sm" onClick={() => void loadTemplates()} disabled={templatesBusy || loading}>
                {templatesBusy ? "Loading..." : "Load templates"}
              </button>
              <button type="button" className="rounded border border-white/30 px-3 py-2 text-sm" onClick={() => void saveTemplate()} disabled={templatesBusy || loading}>
                Save template
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                className="rounded border border-white/20 bg-black/20 px-3 py-2"
                value={form.selectedTemplateId}
                onChange={(event) => setForm((prev) => ({ ...prev, selectedTemplateId: event.target.value }))}
              >
                <option value="">Custom (no template selected)</option>
                {templates.map((template) => (
                  <option key={template.templateId} value={template.templateId}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button type="button" className="rounded border border-white/30 px-3 py-2 text-sm" onClick={applyTemplate} disabled={!selectedTemplate}>
                Apply template
              </button>
            </div>
          </>
        ) : (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Template reuse is available on Enterprise tier.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <select className="rounded border border-white/20 bg-black/20 px-3 py-2" value={form.mode} onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value as ModeValue }))}>
            <option value="classic">Classic</option>
            <option value="elimination">Elimination</option>
            <option value="guilds">Guilds</option>
          </select>
          <input type="number" min={1} className="rounded border border-white/20 bg-black/20 px-3 py-2" value={form.durationMinutes} onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value || 0) }))} />
          <select className="rounded border border-white/20 bg-black/20 px-3 py-2" value={form.wordDifficulty} onChange={(event) => setForm((prev) => ({ ...prev, wordDifficulty: event.target.value as DifficultyValue }))}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <label className="flex items-center gap-2 rounded border border-white/20 px-3 py-2 text-sm">
            <input type="checkbox" checked={form.teamsEnabled} onChange={(event) => setForm((prev) => ({ ...prev, teamsEnabled: event.target.checked }))} />
            Teams enabled
          </label>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <input type="number" min={0} className="rounded border border-white/20 bg-black/20 px-3 py-2" value={form.minSecondsBeforeClaim} onChange={(event) => setForm((prev) => ({ ...prev, minSecondsBeforeClaim: Number(event.target.value || 0) }))} />
          <input type="number" min={0} className="rounded border border-white/20 bg-black/20 px-3 py-2" value={form.minSecondsBetweenClaims} onChange={(event) => setForm((prev) => ({ ...prev, minSecondsBetweenClaims: Number(event.target.value || 0) }))} />
          <input type="number" min={0} className="rounded border border-white/20 bg-black/20 px-3 py-2" value={form.freeRefreshCooldownSeconds} onChange={(event) => setForm((prev) => ({ ...prev, freeRefreshCooldownSeconds: Number(event.target.value || 0) }))} />
          <div className="rounded border border-white/20 px-3 py-2 text-xs text-soft">Claims fields: before, between, refresh</div>
        </div>

        <div className="flex flex-wrap gap-2">
          {metricOptions.map((metric) => {
            const selected = form.metricsEnabled.includes(metric);
            return (
              <button
                key={metric}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs ${selected ? "border-emerald-300 bg-emerald-500/20" : "border-white/20"}`}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    metricsEnabled: selected ? prev.metricsEnabled.filter((item) => item !== metric) : [...prev.metricsEnabled, metric],
                  }))
                }
              >
                {metric}
              </button>
            );
          })}
        </div>

        <button type="submit" className="rounded bg-emerald-500 px-4 py-2 font-semibold text-black disabled:opacity-60" disabled={busy || loading}>
          {busy ? "Creating..." : "Create company game"}
        </button>
      </form>
    </div>
  );
}
