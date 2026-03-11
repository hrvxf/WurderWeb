"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import { parseGameCode } from "@/domain/join/code";
import { extractGameCodeFromPayload } from "@/domain/join/joinLink";

export default function JoinEntryPage() {
  return (
    <Suspense fallback={<JoinEntryPageFallback />}>
      <JoinEntryPageContent />
    </Suspense>
  );
}

function JoinEntryPageFallback() {
  return (
    <main className="glass-surface min-h-[60vh] rounded-3xl px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Join Game</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Loading join form...</h1>
      </div>
    </main>
  );
}

function JoinEntryPageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [payload, setPayload] = useState(() => params.get("code") || "");

  const extractedCode = useMemo(() => extractGameCodeFromPayload(payload), [payload]);
  const parsed = useMemo(() => parseGameCode(extractedCode), [extractedCode]);

  function continueToJoin() {
    if (!parsed.isValid) {
      return;
    }
    router.push(`/join/${parsed.value}`);
  }

  return (
    <main className="glass-surface min-h-[60vh] rounded-3xl px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Join Game</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Enter code manually</h1>
        <p className="mt-3 text-soft">
          Paste a game code or join URL. We accept raw codes and links that include <code>/join/{"{CODE}"}</code>.
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
            {parsed.isValid
              ? "Code is valid and ready."
              : "Code must be six uppercase letters or numbers (A-Z, 0-9)."}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button onClick={continueToJoin} fullWidth disabled={!parsed.isValid}>
            Continue
          </Button>
          <Button href="/" variant="glass" fullWidth>
            Back Home
          </Button>
        </div>
      </div>
    </main>
  );
}
