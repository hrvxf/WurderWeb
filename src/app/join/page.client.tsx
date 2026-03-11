"use client";

import { Component, type ErrorInfo, type ReactNode, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import AuthGate from "@/components/auth/AuthGate";
import Button from "@/components/Button";
import { buildJoinUniversalLink } from "@/domain/join/joinLink";
import { useAuth } from "@/lib/auth/AuthProvider";

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

function JoinGenerator() {
  const { user } = useAuth();
  const [joinState, setJoinState] = useState<JoinState>({ status: "idle" });
  const [qrRenderFailed, setQrRenderFailed] = useState(false);

  const gameCode = joinState.status === "success" ? joinState.gameCode : "";
  const joinLink = useMemo(() => (gameCode ? buildJoinUniversalLink(gameCode) : ""), [gameCode]);

  async function handleCreateGame() {
    if (joinState.status === "creating") return;

    if (!user) {
      setJoinState({
        status: "error",
        message: "You must be signed in to create a game.",
      });
      return;
    }

    setQrRenderFailed(false);
    setJoinState({ status: "creating" });

    try {
      const idToken = await user.getIdToken(false);
      const response = await fetch("/api/join/create-game", {
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
    } catch (error) {
      setJoinState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to create game right now.",
      });
    }
  }

  return (
    <section
      className={`mx-auto max-w-2xl rounded-3xl border border-white/15 bg-black/25 p-6 sm:p-8 ${
        joinState.status === "creating" ? "cursor-progress" : ""
      }`}
    >
      <h1 className="text-3xl font-bold tracking-tight">Create Join QR</h1>
      <p className="mt-3 text-soft">
        Create a game as your signed-in account, then share the QR so players can join.
      </p>

      <div className="mt-6">
        <Button
          onClick={handleCreateGame}
          disabled={joinState.status === "creating"}
          className={joinState.status === "creating" ? "disabled:cursor-progress" : ""}
        >
          {joinState.status === "creating" ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Creating...
            </>
          ) : (
            "Create Game QR"
          )}
        </Button>
      </div>

      {joinState.status === "error" ? (
        <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
          {joinState.message}
        </p>
      ) : null}

      {joinState.status === "success" ? (
        <div className="mt-6 rounded-2xl border border-white/15 bg-black/35 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Game Code</p>
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
              QR render failure detected. Press &ldquo;Create Game QR&rdquo; again.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default function JoinPageClient() {
  return (
    <AuthGate>
      <JoinGenerator />
    </AuthGate>
  );
}
