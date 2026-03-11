"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import { parseGameCode } from "@/domain/join/code";
import GameCodeQrCard from "@/components/join/GameCodeQrCard";

function normalizeAddons(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ClientConfirmation() {
  const params = useSearchParams();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const parsedCode = parseGameCode(params.get("code") || "");
  const code = parsedCode.value;
  const players = params.get("players") || "";
  const addons = useMemo(() => normalizeAddons(params.get("addons")), [params]);

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1200);
  }

  return (
    <section className="mx-auto max-w-2xl glass-surface rounded-3xl p-6 sm:p-8">
      <h1 className="text-3xl font-bold">Game Code Ready</h1>
      <p className="mt-3 text-soft">Share this game code or QR. QR payload uses the canonical universal join URL.</p>

      <div className="mt-6 rounded-2xl border border-white/15 bg-black/25 p-5 text-center">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Game code</p>
        <p className="mt-2 font-mono text-4xl font-bold tracking-[0.1em]">{code || "------"}</p>
        <Button onClick={copyCode} variant="glass" className="mt-4">
          {copyState === "copied" ? "Copied" : "Copy code"}
        </Button>
      </div>

      <div className="mt-6">
        <GameCodeQrCard gameCode={code} onCloseHref="/" />
      </div>

      <div className="mt-6 rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-soft">
        <p>Players: {players || "-"}</p>
        <p>Add-ons: {addons.length > 0 ? addons.join(", ") : "None"}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {parsedCode.isValid ? <Button href={`/join/${code}`}>Test Join Route</Button> : null}
        <Button href="/" variant="glass">
          Back Home
        </Button>
      </div>
    </section>
  );
}


