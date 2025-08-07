"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import Button from "@/components/Button";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

export default function BuyPackage() {
  const router = useRouter();
  const [gameName, setGameName] = useState("");
  const [players, setPlayers] = useState(5);
  const [addons, setAddons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addonPrice = 5;
  const price = players + addons.length * addonPrice;

  const toggleAddon = (addon: string) => {
    setAddons((prev) =>
      prev.includes(addon) ? prev.filter((a) => a !== addon) : [...prev, addon]
    );
  };

  const generateGameCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const getUniqueGameCode = async (): Promise<string> => {
    let code = generateGameCode();
    let exists = true;
    while (exists) {
      const docRef = doc(db, "games", code);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) exists = false;
      else code = generateGameCode();
    }
    return code;
  };

  const handlePurchase = async () => {
    setError("");

    if (!gameName.trim()) {
      setError("Please enter a game name.");
      return;
    }

    if (players <= 0) {
      setError("Please select a valid number of players.");
      return;
    }

    setLoading(true);

    try {
      const gameCode = await getUniqueGameCode();

      await setDoc(doc(db, "games", gameCode), {
        name: gameName.trim(),
        players,
        addons,
        createdAt: serverTimestamp(),
      });

      router.push(
        `/confirmation?code=${gameCode}&players=${players}&addons=${addons.join(",")}`
      );
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-transparent">
      {/* Mobile Header */}
      <div className="sm:hidden flex items-center justify-between bg-white/50 backdrop-blur-md px-4 py-3 shadow">
        <button onClick={() => router.push("/")} className="text-blue-600 font-medium">
          ← Back
        </button>
        <h2 className="font-semibold text-lg">Buy Game Package</h2>
        <div className="w-10" />
      </div>

      {/* Animated Form Container */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center items-start p-4 pt-8 sm:pt-12 pb-8"
      >
        <div className="bg-white/50 text-black rounded-2xl shadow-xl w-full sm:max-w-2xl lg:max-w-5xl backdrop-blur-md flex flex-col lg:flex-row overflow-hidden">
          {/* Left Side – Form */}
          <div className="w-full lg:w-1/2 p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-center mb-6">Buy a Game Package</h1>
            {error && (
              <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center">{error}</p>
            )}

            {/* Game Name */}
            <h3 className="text-lg font-semibold mb-2">Game Name</h3>
            <input
              type="text"
              placeholder="Enter your game name"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 text-black placeholder-gray-500 focus:outline-none focus:ring-2 bg-white focus:ring-yellow-500"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
            />

            {/* Number of Players */}
            <h3 className="text-lg font-semibold mb-2">Number of Players</h3>
            <select
              value={players}
              onChange={(e) => setPlayers(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 text-black focus:outline-none focus:ring-2 bg-white focus:ring-yellow-500"
            >
              {[5, 10, 15, 20, 25, 30].map((n) => (
                <option key={n} value={n}>
                  {n} players
                </option>
              ))}
            </select>

            {/* Add-ons */}
            <h3 className="text-lg font-semibold mb-2">Add-ons</h3>
            <div className="space-y-2 mb-6">
              {["Guilds", "Saboteurs", "Advanced Rules"].map((addon) => (
                <label key={addon} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={addons.includes(addon)}
                    onChange={() => toggleAddon(addon)}
                    className="rounded text-yellow-600 focus:ring-yellow-500"
                  />
                  <span>{addon}</span>
                </label>
              ))}
            </div>

            {/* Price */}
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3  text-lg font-semibold mb-6 shadow-sm">
              Total: £{price}
            </div>

            {/* Purchase Button */}
            <Button
              onClick={handlePurchase}
              disabled={loading}
              className={`w-full py-3 rounded-lg transition ${
                !loading
                  ? "bg-yellow-500 text-black hover:bg-yellow-600"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
            >
              {loading ? "Processing..." : "Purchase & Generate Code"}
            </Button>
          </div>
          {/* Right Side – Info Panel */}
          <div className="hidden lg:flex w-1/2 bg-gradient-to-br backdrop-blur-md items-center justify-center p-10 border-l border-yellow-200 shadow-inner">
            <div className="text-center max-w-md">
              <h2 className="text-4xl font-extrabold mb-4 text-yellow-700">You're the Gamesmaster</h2>
              <p className="text-gray-700 mb-6 leading-relaxed text-lg">
                Bring friends, family or strangers together with <span className="font-semibold">Wurder</span>. 
                Perfect for parties, small or large events, or casual nights — with add-ons to keep things exciting!
              </p>
              <ul className="text-gray-800 text-left mb-8 space-y-3">
                <li className="flex items-center">
                  <svg className="w-6 h-6 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" clipRule="evenodd" />
                  </svg>
                  Put the gamescode into the app, and you're ready to go!
                </li>
                <li className="flex items-center">
                  <svg className="w-6 h-6 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 7a3 3 0 11-6 0 3 3 0 016 0zM4 15a4 4 0 014-4h4a4 4 0 014 4v1H4v-1z" />
                  </svg>
                  Flexible player count & add-ons. Works with 2 players to 200+
                </li>
                <li className="flex items-center">
                  <svg className="w-6 h-6 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v14a1 1 0 01-1.447.894L10 14.118l-5.553 3.776A1 1 0 013 17V3z" />
                  </svg>
                  Perfect for groups & events
                </li>
              </ul>
            </div>
          </div>



        </div>
      </motion.div>

    </div>
  );
}
