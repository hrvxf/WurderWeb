"use client";

import { useSearchParams } from "next/navigation";
import { parseGameCode } from "@/domain/join/code";
import GameCodeQrCard from "@/components/join/GameCodeQrCard";

export default function ClientConfirmation() {
  const params = useSearchParams();

  const parsedCode = parseGameCode(params.get("code") || "");
  const code = parsedCode.value;

  return (
    <section className="mx-auto max-w-2xl glass-surface rounded-3xl p-6 sm:p-8">
      <h1 className="text-3xl font-bold">Share Join QR</h1>
      <p className="mt-3 text-soft">Scan to join instantly. This QR always encodes the universal join link.</p>

      <div className="mt-6">
        <GameCodeQrCard gameCode={code} onCloseHref="/" />
      </div>
      {!parsedCode.isValid ? <p className="mt-4 text-sm text-rose-200">A valid game code is required to render the QR.</p> : null}
    </section>
  );
}


