"use client";

import { Component, type ErrorInfo, type FormEvent, type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import Button from "@/components/Button";
import { parseGameCode } from "@/domain/join/code";
import { buildJoinUniversalLink } from "@/domain/join/joinLink";
import { useAuth } from "@/lib/auth/AuthProvider";
import { persistLastCreatedSession } from "@/lib/game/last-created-session";

type JoinState =
  | { status: "idle" }
  | { status: "creating" }
  | { status: "success"; gameCode: string }
  | { status: "error"; message: string };

type QrBoundaryState = {
  failed: boolean;
};

class QrErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, QrBoundaryState> {
  state: QrBoundaryState = { failed: false };

  static getDerivedStateFromError(): QrBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void error;
    void errorInfo;
    this.props.onError();
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-center text-xs text-black/70">
          QR render failed. Retry creating the game.
        </div>
      );
    }

    return this.props.children;
  }
}

export default function JoinPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const [enteredCode, setEnteredCode] = useState("");
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);
  const [joinState, setJoinState] = useState<JoinState>({ status: "idle" });
  const [qrRenderFailed, setQrRenderFailed] = useState(false);

  const gameCode = joinState.status === "success" ? joinState.gameCode : "";
  const joinLink = useMemo(() => (gameCode ? buildJoinUniversalLink(gameCode) : ""), [gameCode]);

  function handleJoinByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinCodeError(null);
    const parsed = parseGameCode(enteredCode);
    if (!parsed.isValid) {
      setJoinCodeError("Game code must be 6 letters or numbers.");
      return;
    }
    router.push(`/join/${encodeURIComponent(parsed.value)}`);
  }

  async function handleCreateGame() {
    if (joinState.status === "creating") return;

    if (!user) {
      router.push("/login?next=%2Fjoin");
      return;
    }

    setQrRenderFailed(false);
    setJoinState({ status: "creating" });

    try {
      const idToken = await user.getIdToken(false);
      const response = await fetch("/api/b2c/games", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as
        | { gameCode?: string; message?: string; code?: string }
        | null;

      if (!response.ok) {
        const message = payload?.message || "Game creation failed. Please retry.";
        setJoinState({ status: "error", message });
        return;
      }

      if (!payload?.gameCode) {
        setJoinState({
          status: "error",
          message: "Server response was missing a game code.",
        });
        return;
      }

      setJoinState({ status: "success", gameCode: payload.gameCode });
      persistLastCreatedSession({
        gameCode: payload.gameCode,
        gameType: "personal",
        createdAtIso: new Date().toISOString(),
        joinLink: buildJoinUniversalLink(payload.gameCode),
      });
    } catch (error) {
      setJoinState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to create game right now.",
      });
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-3xl border border-white/15 bg-black/25 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Personal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Join or host a personal game</h1>
        <p className="mt-3 text-soft">Enter a game code to join now, or create a personal host QR for players.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/15 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">I have a game code</p>
          <h2 className="mt-2 text-xl font-semibold">Join a session</h2>
          <p className="mt-2 text-sm text-soft">Paste or type your 6-character game code.</p>

          <form className="mt-4 space-y-3" onSubmit={handleJoinByCode}>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.14em] text-muted">Game code</span>
              <input
                value={enteredCode}
                onChange={(event) => setEnteredCode(event.target.value)}
                className="input-dark mt-2 font-mono uppercase tracking-[0.14em]"
                placeholder="ABC123"
                autoCapitalize="characters"
                autoCorrect="off"
              />
            </label>
            {joinCodeError ? (
              <p className="rounded-lg border border-rose-300/35 bg-rose-950/30 px-3 py-2 text-sm text-rose-100">
                {joinCodeError}
              </p>
            ) : null}
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#C7355D] to-[#8E1F45] px-5 text-sm font-semibold text-white transition hover:from-[#D96A5A] hover:to-[#C7355D]"
            >
              Continue to join
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-white/15 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">I am hosting</p>
          <h2 className="mt-2 text-xl font-semibold">Create a personal host QR</h2>
          <p className="mt-2 text-sm text-soft">This creates a standard game code for personal/social sessions.</p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button
              onClick={() => void handleCreateGame()}
              disabled={joinState.status === "creating"}
              className={joinState.status === "creating" ? "disabled:cursor-progress" : ""}
            >
              {joinState.status === "creating" ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Creating...
                </>
              ) : user ? (
                "Create host QR"
              ) : (
                "Sign in to host"
              )}
            </Button>
            {!user ? (
              <Link
                href="/login?next=%2Fjoin"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-black/20 px-4 text-sm font-semibold text-white transition hover:bg-black/30"
              >
                Open sign in
              </Link>
            ) : null}
          </div>

          {joinState.status === "error" ? (
            <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
              {joinState.message}
            </p>
          ) : null}

          {joinState.status === "success" ? (
            <div className="mt-6 rounded-2xl border border-white/15 bg-black/35 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">
                Personal Game Created
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tracking-[0.12em]">{gameCode}</p>
              <p className="mt-2 break-all text-xs text-muted">{joinLink}</p>

              <div className="mt-5 inline-flex rounded-xl border border-white/20 bg-white p-3">
                <QrErrorBoundary onError={() => setQrRenderFailed(true)}>
                  <QRCodeCanvas
                    value={joinLink}
                    size={220}
                    level="M"
                    fgColor="#111111"
                    bgColor="#FFFFFF"
                    marginSize={4}
                  />
                </QrErrorBoundary>
              </div>

              {qrRenderFailed ? (
                <p className="mt-3 text-sm text-rose-200">
                  QR render failure detected. Press &ldquo;Create host QR&rdquo; again.
                </p>
              ) : null}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
