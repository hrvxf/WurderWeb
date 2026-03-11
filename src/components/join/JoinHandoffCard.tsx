"use client";

import { Component, type ErrorInfo, type ReactNode, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Button from "@/components/Button";
import { parseGameCode } from "@/domain/join/code";
import { buildAppJoinLink } from "@/domain/join/links";
import { extractGameCodeFromPayload } from "@/domain/join/joinLink";

type Props = {
  initialPayload?: string;
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

export default function JoinHandoffCard({ initialPayload = "" }: Props) {
  const [payload, setPayload] = useState(initialPayload);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const payloadHasValue = payload.trim().length > 0;
  const extractedCode = useMemo(() => extractGameCodeFromPayload(payload), [payload]);
  const parsed = useMemo(() => parseGameCode(extractedCode), [extractedCode]);
  const isCodeSpecific = parsed.isValid;
  const appDeepLink = isCodeSpecific ? buildAppJoinLink(parsed.value) : buildAppJoinLink("");
  const downloadHref = isCodeSpecific ? `/download?gameCode=${parsed.value}` : "/download";
  const manualHref = isCodeSpecific ? `/join/${parsed.value}` : "/join";

  async function copyDeepLink() {
    try {
      await navigator.clipboard.writeText(appDeepLink);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch (error) {
      console.error("Failed to copy join deep link", error);
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  function openInApp() {
    try {
      window.location.assign(appDeepLink);
    } catch (error) {
      console.error("Failed to open app deep link", error);
      window.location.assign(downloadHref);
    }
  }

  return (
    <main className="glass-surface min-h-[60vh] rounded-3xl px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Join Wurder</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Scan to open the Wurder app</h1>
        <p className="mt-3 text-soft">
          {isCodeSpecific
            ? `Game code ${parsed.value} is attached to this handoff.`
            : "Generate a generic app handoff or paste a join payload with a game code."}
        </p>

        <label htmlFor="join-payload" className="mt-8 block text-sm text-soft">
          Game code or join link
        </label>
        <input
          id="join-payload"
          className="input-dark mt-2"
          placeholder="ABC123 or https://wurder.app/join/ABC123"
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="mt-4 rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm">
          <p className="text-soft">Resolved game code: {parsed.value || "------"}</p>
          <p className="mt-1 text-muted">
            {isCodeSpecific
              ? "Deep link is game-specific and ready."
              : payloadHasValue
                ? "Input did not resolve to a valid six-character code. Generic handoff is active."
                : "No code provided. Generic app handoff is active."}
          </p>
        </div>

        <section className="mt-6 rounded-2xl border border-white/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Join QR</p>
          <div className="mt-4 inline-flex rounded-xl border border-white/20 bg-white p-4">
            <QrRenderBoundary
              fallback={
                <div className="flex h-[170px] w-[170px] items-center justify-center rounded-lg border border-black/10 bg-white px-4 text-center text-xs text-black/70">
                  QR unavailable. Use Open in Wurder or copy the deep link below.
                </div>
              }
            >
              <QRCodeCanvas value={appDeepLink} size={170} level="M" fgColor="#111111" bgColor="#FFFFFF" marginSize={4} />
            </QrRenderBoundary>
          </div>

          <p className="mt-4 break-all text-xs text-muted">{appDeepLink}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button onClick={openInApp} fullWidth>
              Open in Wurder
            </Button>
            <Button href={downloadHref} variant="glass" fullWidth>
              Download Wurder
            </Button>
            <Button onClick={copyDeepLink} variant="glass" fullWidth>
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy Deep Link"}
            </Button>
            <Button href={manualHref} variant="ghost" fullWidth>
              Enter code manually
            </Button>
          </div>
        </section>

        <p className="mt-5 text-sm text-muted">
          Already have the app? Enter your code manually.
        </p>
      </div>
    </main>
  );
}
