"use client";

import { Component, type ErrorInfo, type ReactNode, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Button from "@/components/Button";
import { parseGameCode } from "@/domain/join/code";
import { buildAppJoinLink, buildJoinUniversalLink } from "@/domain/join/links";

type Props = {
  initialCode?: string;
};

type QrBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type QrBoundaryState = {
  hasError: boolean;
};

class QrRenderBoundary extends Component<QrBoundaryProps, QrBoundaryState> {
  state: QrBoundaryState = { hasError: false };

  static getDerivedStateFromError(): QrBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Join QR render failed", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function JoinHandoffCard({ initialCode = "" }: Props) {
  const parsedInitial = useMemo(() => parseGameCode(initialCode), [initialCode]);
  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "error">(
    parsedInitial.isValid ? "ready" : "idle"
  );
  const [generatedCode, setGeneratedCode] = useState(parsedInitial.isValid ? parsedInitial.value : "");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const parsedCode = useMemo(() => parseGameCode(generatedCode), [generatedCode]);
  const hasCode = parsedCode.isValid;
  const appDeepLink = hasCode ? buildAppJoinLink(parsedCode.value) : buildAppJoinLink("");
  const universalLink = hasCode ? buildJoinUniversalLink(parsedCode.value) : "";
  const downloadHref = hasCode ? `/download?gameCode=${parsedCode.value}` : "/download";
  const manualHref = hasCode ? `/join/${parsedCode.value}` : "/join";

  async function generateJoinCode() {
    setStatus("generating");
    setErrorMessage("");

    try {
      const response = await fetch("/api/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.code !== "string") {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Unable to generate a join code right now. Please try again."
        );
      }

      const parsed = parseGameCode(data.code);
      if (!parsed.isValid) {
        throw new Error("Generated code is invalid. Please try again.");
      }

      setGeneratedCode(parsed.value);
      setStatus("ready");
    } catch (error) {
      const fallbackMessage =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Unable to generate a join code right now. Please try again.";
      console.error("Join code generation failed", error);
      setErrorMessage(fallbackMessage);
      setStatus("error");
    }
  }

  async function copyCode() {
    try {
      if (!hasCode) {
        return;
      }

      await navigator.clipboard.writeText(parsedCode.value);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch (error) {
      console.error("Failed to copy join code", error);
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  return (
    <main className="glass-surface min-h-[60vh] rounded-3xl px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Join Wurder</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Generate Join Code</h1>
        <p className="mt-3 text-soft">
          Generate a join code, then scan the QR or open directly in the Wurder app.
        </p>

        <div className="mt-6">
          <Button
            onClick={generateJoinCode}
            fullWidth
            disabled={status === "generating"}
          >
            {status === "generating" ? "Generating..." : "Generate Join Code"}
          </Button>
        </div>

        {status === "error" ? (
          <div className="mt-4 rounded-xl border border-rose-300/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-100">
            {errorMessage || "Unable to generate a join code right now. Please try again."}
          </div>
        ) : null}

        {status === "ready" && hasCode ? (
          <div className="mt-5 rounded-2xl border border-white/15 bg-black/25 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Your join code</p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-[0.12em]">{parsedCode.value}</p>
          </div>
        ) : null}

        <section className="mt-5 rounded-2xl border border-white/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Join QR</p>
          <div className="mt-4 inline-flex rounded-xl border border-white/20 bg-white p-4">
            <QrRenderBoundary
              fallback={
                <div className="flex h-[170px] w-[170px] items-center justify-center rounded-lg border border-black/10 bg-white px-4 text-center text-xs text-black/70">
                  QR unavailable. Use Open in Wurder, Copy Code, or Download Wurder.
                </div>
              }
            >
              {status === "ready" && hasCode ? (
                <QRCodeCanvas value={appDeepLink} size={170} level="M" fgColor="#111111" bgColor="#FFFFFF" marginSize={4} />
              ) : (
                <div className="flex h-[170px] w-[170px] items-center justify-center rounded-lg border border-black/10 bg-white px-4 text-center text-xs text-black/70">
                  Generate a join code to create QR.
                </div>
              )}
            </QrRenderBoundary>
          </div>

          <p className="mt-4 break-all text-xs text-muted">{status === "ready" && hasCode ? appDeepLink : "wurder://join/{GAME_CODE}"}</p>
          {universalLink ? <p className="mt-1 break-all text-xs text-muted">{universalLink}</p> : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button
              onClick={() => {
                try {
                  window.location.assign(appDeepLink);
                } catch (error) {
                  console.error("Failed to open app deep link", error);
                  window.location.assign(downloadHref);
                }
              }}
              fullWidth
              disabled={!hasCode}
            >
              Open in Wurder
            </Button>
            <Button href={downloadHref} variant="glass" fullWidth>
              Download Wurder
            </Button>
            <Button onClick={copyCode} variant="glass" fullWidth disabled={!hasCode}>
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy Code"}
            </Button>
            <Button href={manualHref} variant="ghost" fullWidth>
              Enter code manually
            </Button>
          </div>
        </section>

        <p className="mt-5 text-sm text-muted">
          Scan the QR with another device, or enter the code manually in the app.
        </p>
      </div>
    </main>
  );
}
