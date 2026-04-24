"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import BusinessSessionBasicsStep from "@/components/business/sessions/BusinessSessionBasicsStep";
import BusinessSessionCreatedState from "@/components/business/sessions/BusinessSessionCreatedState";
import BusinessSessionReviewStep from "@/components/business/sessions/BusinessSessionReviewStep";
import BusinessSessionSetupStep from "@/components/business/sessions/BusinessSessionSetupStep";
import BusinessSessionStepper from "@/components/business/sessions/BusinessSessionStepper";
import { buildJoinUniversalLink } from "@/domain/join/joinLink";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  defaultBusinessSetup,
  BUSINESS_STORAGE_ORG_ID_KEY,
  BUSINESS_STORAGE_ORG_NAME_KEY,
} from "@/lib/business/session-defaults";
import {
  buildBusinessSessionManagerConfig,
  buildCreateBusinessSessionPayload,
  toBusinessSessionName,
} from "@/lib/business/session-payload-mapper";
import type { SetupState, SetupStep } from "@/lib/business/session-options";
import { persistLastCreatedSession } from "@/lib/game/last-created-session";
import type { SessionGameType } from "@/lib/game/session-type";
import type { HandoffB2BManagerConfig } from "@/domain/handoff/setup-draft";
import { addOptionalWebSentryBreadcrumb } from "@/lib/telemetry/web-breadcrumbs";

type CreatedBusinessSessionResult = {
  gameCode: string;
  orgId: string;
  orgName: string;
  joinLink: string;
  templateId: string | null;
  setupLink: string | null;
  setupId: string | null;
  setupExpiresAtMs: number | null;
  managerConfig: HandoffB2BManagerConfig;
  managerParticipation: "host_only" | "host_player";
  mode: string;
};

export default function CreateBusinessSessionPage() {
  const { user, loading, profile } = useAuth();
  const searchParams = useSearchParams();

  const [setup, setSetup] = useState<SetupState>(defaultBusinessSetup);
  const [step, setStep] = useState<SetupStep>(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedBusinessSessionResult | null>(null);
  const [copyState, setCopyState] = useState<{ gameCode: boolean; joinLink: boolean; setupLink: boolean }>({
    gameCode: false,
    joinLink: false,
    setupLink: false,
  });
  const [setupQrBusy, setSetupQrBusy] = useState(false);

  useEffect(() => {
    const queryOrgName = searchParams.get("orgName")?.trim() ?? "";
    const queryOrgId = searchParams.get("orgId")?.trim() ?? "";
    const storedOrgName =
      typeof window !== "undefined"
        ? window.localStorage.getItem(BUSINESS_STORAGE_ORG_NAME_KEY)?.trim() ?? ""
        : "";
    const storedOrgId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(BUSINESS_STORAGE_ORG_ID_KEY)?.trim() ?? ""
        : "";

    const initialOrgName = queryOrgName || storedOrgName || "";
    const initialOrgId = queryOrgId || storedOrgId || "";
    const displayName = profile?.name?.trim() || profile?.firstName?.trim() || "Session";

    setSetup((prev) => ({
      ...prev,
      orgName: prev.orgName || initialOrgName,
      orgId: prev.orgId || initialOrgId || undefined,
      sessionLabel: prev.sessionLabel || `${displayName} Team Session`,
    }));
  }, [profile?.firstName, profile?.name, searchParams]);

  const resolvedSessionName = useMemo(
    () => toBusinessSessionName(setup.orgName, setup.sessionLabel),
    [setup.orgName, setup.sessionLabel]
  );
  const isOrgNameValid = setup.orgName.trim().length > 0;
  const canContinue = !loading && !busy && (step !== 1 || isOrgNameValid);
  const continueDisabledReason = loading
    ? "Checking account state..."
    : busy
      ? "Please wait for the current action to finish."
      : step === 1 && !isOrgNameValid
        ? "Add an organisation name to continue."
        : null;
  const canStartSession = !loading && !busy && isOrgNameValid;
  const startDisabledReason = loading
    ? "Checking account state..."
    : busy
      ? "Starting session..."
      : !isOrgNameValid
        ? "Add an organisation name before starting."
        : null;

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return setMessage("Sign in before creating a business session.");
    if (!setup.orgName.trim()) return setMessage("Organisation name is required.");

    setBusy(true);
    setMessage(null);
    setResult(null);

    try {
      const token = await user.getIdToken();
      const createPayload = buildCreateBusinessSessionPayload(setup);
      addOptionalWebSentryBreadcrumb({
        category: "game.create",
        message: "b2b_create_payload_sent",
        level: "info",
        data: {
          surface: "business-session",
          mode: createPayload.mode,
          freeForAllVariant: createPayload.freeForAllVariant ?? null,
          guildWinCondition: createPayload.guildWinCondition ?? null,
          managerParticipation: createPayload.managerParticipation,
        },
      });
      const response = await fetch("/api/b2b/sessions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(createPayload),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        gameCode?: string;
        orgId?: string;
        templateId?: string | null;
        gameType?: SessionGameType;
      };

      if (!response.ok) {
        addOptionalWebSentryBreadcrumb({
          category: "game.create",
          message: "canonical_create_payload_rejected",
          level: "warning",
          data: {
            surface: "business-session",
            mode: createPayload.mode,
            status: response.status,
            freeForAllVariant: createPayload.freeForAllVariant ?? null,
            guildWinCondition: createPayload.guildWinCondition ?? null,
          },
        });
        throw new Error(payload.message ?? "Failed to start business session.");
      }

      if (payload.gameType && payload.gameType !== "b2b") {
        throw new Error("Unexpected session type returned for Business session creation.");
      }

      const resultOrgId = String(payload.orgId ?? setup.orgId ?? "");
      const gameCode = String(payload.gameCode ?? "");
      const joinLink = buildJoinUniversalLink(gameCode);
      const managerConfig = buildBusinessSessionManagerConfig(setup);
      trackEvent(ANALYTICS_EVENTS.b2bQrJoinGenerated, { gameCode, orgId: resultOrgId || null });
      setResult({
        gameCode,
        orgId: resultOrgId,
        orgName: setup.orgName.trim(),
        joinLink,
        templateId: typeof payload.templateId === "string" ? payload.templateId : null,
        setupLink: null,
        setupId: null,
        setupExpiresAtMs: null,
        managerConfig: {
          ...managerConfig,
        },
        managerParticipation: managerConfig.managerParticipation,
        mode: managerConfig.mode,
      });
      addOptionalWebSentryBreadcrumb({
        category: "game.create",
        message: "canonical_create_payload_validated",
        level: "info",
        data: {
          surface: "business-session",
          gameCode,
          mode: managerConfig.mode,
          freeForAllVariant: managerConfig.freeForAllVariant ?? null,
          guildWinCondition: managerConfig.guildWinCondition ?? null,
        },
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(BUSINESS_STORAGE_ORG_NAME_KEY, setup.orgName.trim());
        if (resultOrgId) window.localStorage.setItem(BUSINESS_STORAGE_ORG_ID_KEY, resultOrgId);
        persistLastCreatedSession({
          gameCode,
          gameType: "b2b",
          createdAtIso: new Date().toISOString(),
          joinLink,
          orgId: resultOrgId || null,
          orgName: setup.orgName.trim(),
        });
      }
    } catch (error) {
      addOptionalWebSentryBreadcrumb({
        category: "game.create",
        message: "canonical_create_payload_rejected",
        level: "error",
        data: {
          surface: "business-session",
          mode: setup.gameMode,
          freeForAllVariant: setup.freeForAllVariant,
          guildWinCondition: setup.guildWinCondition,
          error: error instanceof Error ? error.message : "Failed to start business session.",
        },
      });
      setMessage(error instanceof Error ? error.message : "Failed to start business session.");
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    if (step === 1 && !setup.orgName.trim()) {
      setMessage("Organisation name is required.");
      return;
    }
    setMessage(null);
    setStep((prev) => (prev < 3 ? ((prev + 1) as SetupStep) : prev));
  }

  function goBack() {
    setMessage(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as SetupStep) : prev));
  }

  function setCopied(key: "gameCode" | "joinLink" | "setupLink") {
    setCopyState((prev) => ({ ...prev, [key]: true }));
    window.setTimeout(() => {
      setCopyState((prev) => ({ ...prev, [key]: false }));
    }, 1400);
  }

  async function copyText(value: string, key: "gameCode" | "joinLink" | "setupLink") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
    } catch {
      setMessage("Clipboard copy failed. Please copy manually.");
    }
  }

  function createAnother() {
    setResult(null);
    setMessage(null);
    setStep(1);
    setCopyState({ gameCode: false, joinLink: false, setupLink: false });
    setSetup((prev) => ({ ...prev, sessionLabel: "" }));
  }

  async function generateSetupQr() {
    if (!user || !result) return;
    setSetupQrBusy(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/handoff/setups", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gameType: "b2b",
          mode: result.mode,
          orgId: result.orgId,
          templateId: result.templateId,
          sessionType: result.managerParticipation === "host_player" ? "player" : "host_only",
          managerConfig: result.managerConfig,
          analyticsEnabled: true,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        setupId?: string;
        universalLink?: string;
        expiresAtMs?: number;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to generate setup QR.");
      }
      if (typeof payload.setupId !== "string" || typeof payload.universalLink !== "string" || typeof payload.expiresAtMs !== "number") {
        throw new Error("Setup response was incomplete.");
      }

      trackEvent(ANALYTICS_EVENTS.b2bQrSetupGenerated, {
        setupId: payload.setupId,
        orgId: result.orgId,
      });

      setResult((prev) =>
        prev
          ? {
              ...prev,
              setupId: payload.setupId ?? null,
              setupLink: payload.universalLink ?? null,
              setupExpiresAtMs: payload.expiresAtMs ?? null,
            }
          : prev
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate setup QR.");
    } finally {
      setSetupQrBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[44rem] space-y-4 px-4 py-3 sm:space-y-5 sm:px-5 sm:py-5">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start business session</h1>
        <p className="text-sm text-soft">
          Configure session mode and duration in three steps, with reporting-ready defaults applied automatically.
        </p>
        {!result ? <BusinessSessionStepper step={step} /> : null}
      </header>

      {message ? <p className="surface-panel-muted px-4 py-3 text-sm">{message}</p> : null}
      {result ? (
        <BusinessSessionCreatedState
          result={result}
          copyState={copyState}
          onCopyGameCode={() => void copyText(result.gameCode, "gameCode")}
          onCopyJoinLink={() => void copyText(result.joinLink, "joinLink")}
          onCopySetupLink={() => {
            if (result.setupLink) void copyText(result.setupLink, "setupLink");
          }}
          onGenerateSetupQr={() => void generateSetupQr()}
          setupGenerating={setupQrBusy}
          onCreateAnother={createAnother}
        />
      ) : (
        <form
          onSubmit={(event) => void createSession(event)}
          className="surface-panel space-y-6 p-4 sm:p-6"
          aria-busy={busy}
        >
          {busy ? (
            <div className="surface-panel-muted px-3 py-2 text-xs text-white/75">
              Starting business session and preparing reporting...
            </div>
          ) : null}

          {step === 1 ? (
            <BusinessSessionBasicsStep
              setup={setup}
              onOrgNameChange={(value) =>
                setSetup((prev) => ({ ...prev, orgName: value, orgId: undefined }))
              }
              onSessionLabelChange={(value) => setSetup((prev) => ({ ...prev, sessionLabel: value }))}
            />
          ) : null}

          {step === 2 ? (
            <BusinessSessionSetupStep
              gameMode={setup.gameMode}
              freeForAllVariant={setup.freeForAllVariant}
              guildWinCondition={setup.guildWinCondition}
              length={setup.length}
              managerParticipation={setup.managerParticipation}
              onGameModeChange={(value) =>
                setSetup((prev) => ({
                  ...prev,
                  gameMode: value,
                  freeForAllVariant: value === "free_for_all" ? prev.freeForAllVariant : "classic",
                  guildWinCondition: value === "guilds" ? prev.guildWinCondition : "score",
                }))
              }
              onFreeForAllVariantChange={(value) =>
                setSetup((prev) => ({ ...prev, freeForAllVariant: value }))
              }
              onGuildWinConditionChange={(value) =>
                setSetup((prev) => ({ ...prev, guildWinCondition: value }))
              }
              onLengthChange={(value) => setSetup((prev) => ({ ...prev, length: value }))}
              onManagerParticipationChange={(value) =>
                setSetup((prev) => ({ ...prev, managerParticipation: value }))
              }
            />
          ) : null}

          {step === 3 ? (
            <BusinessSessionReviewStep setup={setup} resolvedSessionName={resolvedSessionName} />
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              className="control-secondary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
              onClick={goBack}
              disabled={step === 1 || busy}
            >
              Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:opacity-60"
                onClick={goNext}
                disabled={!canContinue}
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex min-w-[8.5rem] items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-105 disabled:opacity-60"
                disabled={!canStartSession}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
                    Starting...
                  </span>
                ) : (
                  "Start session"
                )}
              </button>
            )}
          </div>

          {step < 3 && continueDisabledReason ? (
            <p className="text-xs text-white/65">{continueDisabledReason}</p>
          ) : null}
          {step === 3 && startDisabledReason ? (
            <p className="text-xs text-white/65">{startDisabledReason}</p>
          ) : null}
        </form>
      )}
    </section>
  );
}
