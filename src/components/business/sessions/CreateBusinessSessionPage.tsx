"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import BusinessSessionBasicsStep from "@/components/business/sessions/BusinessSessionBasicsStep";
import BusinessSessionCreatedState from "@/components/business/sessions/BusinessSessionCreatedState";
import BusinessSessionReviewStep from "@/components/business/sessions/BusinessSessionReviewStep";
import BusinessSessionSetupStep from "@/components/business/sessions/BusinessSessionSetupStep";
import BusinessSessionStepper from "@/components/business/sessions/BusinessSessionStepper";
import { buildJoinUniversalLink } from "@/domain/join/joinLink";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  defaultSetup,
  STORAGE_ORG_ID_KEY,
  STORAGE_ORG_NAME_KEY,
} from "@/lib/company-game/companyGameDefaults";
import { buildCreateCompanyGamePayload, toSessionName } from "@/lib/company-game/companyGamePayloadMapper";
import type { SetupState, SetupStep } from "@/lib/company-game/companyGameOptions";
import { persistLastCreatedSession } from "@/lib/game/last-created-session";
import type { SessionGameType } from "@/lib/game/session-type";

type CreatedBusinessSessionResult = {
  gameCode: string;
  orgId: string;
  orgName: string;
  joinLink: string;
  managerParticipation: "host_only" | "host_player";
};

export default function CreateBusinessSessionPage() {
  const { user, loading, profile } = useAuth();
  const searchParams = useSearchParams();

  const [setup, setSetup] = useState<SetupState>(defaultSetup);
  const [step, setStep] = useState<SetupStep>(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedBusinessSessionResult | null>(null);
  const [copyState, setCopyState] = useState<{ gameCode: boolean; joinLink: boolean }>({
    gameCode: false,
    joinLink: false,
  });

  useEffect(() => {
    const queryOrgName = searchParams.get("orgName")?.trim() ?? "";
    const queryOrgId = searchParams.get("orgId")?.trim() ?? "";
    const storedOrgName =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_ORG_NAME_KEY)?.trim() ?? ""
        : "";
    const storedOrgId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_ORG_ID_KEY)?.trim() ?? ""
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
    () => toSessionName(setup.orgName, setup.sessionLabel),
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
      const response = await fetch("/api/b2b/sessions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(buildCreateCompanyGamePayload(setup)),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        gameCode?: string;
        orgId?: string;
        gameType?: SessionGameType;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to start business session.");
      }

      if (payload.gameType && payload.gameType !== "business") {
        throw new Error("Unexpected session type returned for Business session creation.");
      }

      const resultOrgId = String(payload.orgId ?? setup.orgId ?? "");
      const gameCode = String(payload.gameCode ?? "");
      const joinLink = buildJoinUniversalLink(gameCode);
      setResult({
        gameCode,
        orgId: resultOrgId,
        orgName: setup.orgName.trim(),
        joinLink,
        managerParticipation: setup.managerParticipation,
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_ORG_NAME_KEY, setup.orgName.trim());
        if (resultOrgId) window.localStorage.setItem(STORAGE_ORG_ID_KEY, resultOrgId);
        persistLastCreatedSession({
          gameCode,
          gameType: "business",
          createdAtIso: new Date().toISOString(),
          joinLink,
          orgId: resultOrgId || null,
          orgName: setup.orgName.trim(),
        });
      }
    } catch (error) {
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

  function setCopied(key: "gameCode" | "joinLink") {
    setCopyState((prev) => ({ ...prev, [key]: true }));
    window.setTimeout(() => {
      setCopyState((prev) => ({ ...prev, [key]: false }));
    }, 1400);
  }

  async function copyText(value: string, key: "gameCode" | "joinLink") {
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
    setCopyState({ gameCode: false, joinLink: false });
    setSetup((prev) => ({ ...prev, sessionLabel: "" }));
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

      {message ? <p className="rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-sm">{message}</p> : null}
      {result ? (
        <BusinessSessionCreatedState
          result={result}
          copyState={copyState}
          onCopyGameCode={() => void copyText(result.gameCode, "gameCode")}
          onCopyJoinLink={() => void copyText(result.joinLink, "joinLink")}
          onCreateAnother={createAnother}
        />
      ) : (
        <form
          onSubmit={(event) => void createSession(event)}
          className="space-y-6 rounded-2xl border border-white/15 bg-black/25 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.22)] sm:p-6"
          aria-busy={busy}
        >
          {busy ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/75">
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
              length={setup.length}
              managerParticipation={setup.managerParticipation}
              onGameModeChange={(value) => setSetup((prev) => ({ ...prev, gameMode: value }))}
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
              className="rounded-xl border border-white/25 px-4 py-2 text-sm font-medium transition hover:bg-white/5 disabled:opacity-50"
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
