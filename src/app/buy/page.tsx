"use client";

import { FormEvent, useMemo, useState } from "react";
import Button from "@/components/Button";
import { buildPurchasePayload, mapPurchaseError } from "@/domain/purchase/client";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

const ADDONS = ["Guilds", "Saboteurs", "Advanced Rules"];
const ADDON_PRICE = 5;

export default function BuyPage() {
  const [gameName, setGameName] = useState("Wurder Night");
  const [players, setPlayers] = useState(10);
  const [addons, setAddons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const price = useMemo(() => players + addons.length * ADDON_PRICE, [players, addons.length]);

  function toggleAddon(addon: string) {
    setAddons((current) =>
      current.includes(addon) ? current.filter((item) => item !== addon) : [...current, addon]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!gameName.trim()) {
      setError("Please enter a game name.");
      return;
    }

    setLoading(true);
    trackEvent(ANALYTICS_EVENTS.purchaseStarted, {
      player_count: players,
      addon_count: addons.length,
    });

    try {
      const response = await fetch("/api/purchase-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPurchasePayload(gameName, players, addons)),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.code) {
        const message = typeof data?.error === "string" ? data.error : "Unable to process purchase right now.";
        throw new Error(message);
      }

      trackEvent(ANALYTICS_EVENTS.purchaseSuccess, {
        player_count: data.players ?? players,
        addon_count: Array.isArray(data.addons) ? data.addons.length : addons.length,
      });

      const params = new URLSearchParams({
        code: data.code,
        players: String(data.players ?? players),
        gameName: gameName.trim(),
      });

      if (Array.isArray(data.addons) && data.addons.length > 0) {
        params.set("addons", data.addons.join(","));
      }

      window.location.assign(`/confirmation?${params.toString()}`);
    } catch (submitError) {
      const message = mapPurchaseError(submitError);
      trackEvent(ANALYTICS_EVENTS.purchaseError, { reason: message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={handleSubmit} className="glass-surface rounded-3xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold">Buy a Game Package</h1>
        <p className="mt-2 text-soft">Create a host-ready game code for your lobby and share with players.</p>

        {error ? <p className="mt-4 rounded-xl border border-red-400/40 bg-red-950/45 p-3 text-sm text-red-100">{error}</p> : null}

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm text-soft">Game name</span>
            <input
              className="input-dark mt-2"
              value={gameName}
              onChange={(event) => setGameName(event.target.value)}
              maxLength={64}
            />
          </label>

          <label className="block">
            <span className="text-sm text-soft">Players</span>
            <select
              className="input-dark mt-2"
              value={players}
              onChange={(event) => setPlayers(Number(event.target.value))}
            >
              {[5, 10, 15, 20, 25, 30, 50, 100, 200].map((value) => (
                <option key={value} value={value}>
                  {value} players
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-sm text-soft">Add-ons</p>
            <div className="mt-3 space-y-2">
              {ADDONS.map((addon) => (
                <label key={addon} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={addons.includes(addon)}
                    onChange={() => toggleAddon(addon)}
                  />
                  <span>{addon}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between rounded-xl border border-white/15 bg-black/20 px-4 py-3">
          <span className="text-soft">Total</span>
          <span className="text-xl font-semibold">Â£{price}</span>
        </div>

        <Button type="submit" disabled={loading} fullWidth className="mt-6">
          {loading ? "Generating code..." : "Purchase & Generate Code"}
        </Button>
      </form>

      <aside className="glass-surface rounded-3xl p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Host Readiness</h2>
        <ul className="mt-4 space-y-3 text-soft">
          <li>Game code is generated as a 6-character uppercase code.</li>
          <li>Players can join via manual code or QR handoff link.</li>
          <li>Dispute and kill claim language stays consistent with app rules.</li>
        </ul>
      </aside>
    </section>
  );
}
