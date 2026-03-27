"use client";

import { Component, type ErrorInfo, type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import Button from "@/components/Button";
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
  const [joinState, setJoinState] = useState<JoinState>({ status: "idle" });
  const [qrRenderFailed, setQrRenderFailed] = useState(false);

  const gameCode = joinState.status === "success" ? joinState.gameCode : "";
  const joinLink = useMemo(() => (gameCode ? buildJoinUniversalLink(gameCode) : ""), [gameCode]);

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
        gameType: "b2c",
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
      <div className="surface-panel rounded-3xl p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Personal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Join in app or start a personal session</h1>
        <p className="mt-3 text-soft">Gameplay runs in the app. Use a game code to continue in app, or start a personal session and share the join QR with players.</p>
      </div>

      <div className="grid gap-4">
        <article className="surface-panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">I am starting a session</p>
          <h2 className="mt-2 text-xl font-semibold">Start a personal session</h2>
          <p className="mt-2 text-sm text-soft">This creates a standard game code and host QR for personal/social sessions.</p>

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
                "Start session"
              ) : (
                "Sign in to start session"
              )}
            </Button>
            {!user ? (
              <Link
                href="/login?next=%2Fjoin"
                className="control-secondary min-h-10 rounded-xl px-4 text-sm font-semibold text-white"
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
            <div className="surface-panel-muted mt-6 rounded-2xl p-5">
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
                  QR render failure detected. Press &ldquo;Start session&rdquo; again.
                </p>
              ) : null}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
