"use client";

import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Button from "@/components/Button";
import { parseGameCode } from "@/domain/join/code";
import { buildJoinUniversalLink } from "@/domain/join/joinLink";

type Props = {
  gameCode: string;
  onCloseHref?: string;
};

export default function GameCodeQrCard({ gameCode, onCloseHref = "/" }: Props) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const parsedCode = useMemo(() => parseGameCode(gameCode), [gameCode]);
  const joinLink = parsedCode.isValid ? buildJoinUniversalLink(parsedCode.value) : "";

  function copyLink() {
    if (!joinLink) return;
    navigator.clipboard.writeText(joinLink);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  return (
    <section className="rounded-2xl border border-white/15 bg-black/25 p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">Join QR</p>
      <h2 className="mt-2 font-mono text-3xl font-bold tracking-[0.1em]">
        {parsedCode.isValid ? `Game ${parsedCode.value}` : "Invalid game code"}
      </h2>

      <div className="mt-5 inline-flex rounded-xl border border-white/20 bg-white p-4">
        {joinLink ? (
          <QRCodeCanvas value={joinLink} size={170} level="M" fgColor="#111111" bgColor="#FFFFFF" marginSize={4} />
        ) : (
          <div className="flex h-[170px] w-[170px] items-center justify-center rounded-lg border border-black/10 bg-white px-4 text-center text-xs text-black/70">
            Enter a valid six-character game code to generate a join QR.
          </div>
        )}
      </div>

      <p className="mt-4 break-all text-xs text-muted">{joinLink || "https://wurder.app/join/{GAME_CODE}"}</p>
      {!parsedCode.isValid ? (
        <p className="mt-2 text-xs text-rose-200">Game code must be six uppercase letters or numbers.</p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button onClick={copyLink} disabled={!joinLink} fullWidth>
          {copyState === "copied" ? "Copied" : "Copy Link"}
        </Button>
        <Button href={onCloseHref} variant="glass" fullWidth>
          Close
        </Button>
      </div>
    </section>
  );
}
