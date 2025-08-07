"use client";

import { useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import Footer from "@/components/Footer";
import { QRCodeCanvas } from "qrcode.react";
import { EnvelopeIcon, ChatBubbleLeftEllipsisIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

function parseAddons(params: URLSearchParams): string[] {
  const addons = params.get("addons");
  if (!addons) return [];
  return addons
    .split(",")
    .map((a: string) => a.trim())
    .filter((a: string) => a !== "")
    .map((a: string) => a.charAt(0).toUpperCase() + a.slice(1));
}

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const players = searchParams.get("players");
  const addons = parseAddons(searchParams);
  const [toast, setToast] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const copyToClipboard = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      showToast("Game code copied!");
    }
  };

  const shareWhatsApp = () => {
    if (code) {
      const message = `Join my Wurder game! Use code: ${code}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    }
  };

  const shareEmail = () => {
    if (code) {
      const subject = "Join my Wurder Game!";
      const body = `Hey! Join my Wurder game using this code: ${code}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `wurder-game-${code}.png`;
      link.click();
    }
  };

  return (
    
    <div className="flex flex-col min-h-screen bg-transparent">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-grow flex flex-col items-center justify-center px-6 py-8"
      >
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-6 w-full max-w-lg text-center">
          <h1 className="text-3xl font-extrabold mb-3 text-yellow-900">Your Game is Ready!</h1>
          <p className="text-base text-gray-700 mb-6">
            Share this code with your players to join the game in the Wurder app.
          </p>

          {/* Game Code */}
          <motion.div
            animate={{
              scale: [1, 1.02, 1],
              boxShadow: [
                "0 0 0 rgba(0,0,0,0)",
                "0 0 15px rgba(255,215,0,0.4)",
                "0 0 0 rgba(0,0,0,0)"
              ]
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="relative bg-white border border-yellow-200 rounded-xl px-6 py-4 shadow-lg mb-5 text-4xl font-mono font-bold text-gray-900 group"
          >
            {code}
            <button
              onClick={copyToClipboard}
              className="absolute right-3 top-3 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded shadow"
            >
              Copy
            </button>
          </motion.div>

          {/* QR + Hover Download */}
          <div className="relative group mb-5 inline-block">
            <div
              ref={qrRef}
              className="bg-white border border-gray-200 rounded-lg shadow p-3 relative overflow-hidden"
            >
              <QRCodeCanvas value={code || ""} size={140} />
              {/* Dark overlay on hover */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition"></div>
            </div>
            <button
              onClick={downloadQR}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition bg-gray-800 text-white p-2 rounded-full shadow"
              title="Download QR"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Players */}
          <div className="bg-white border border-gray-200 rounded-md px-3 py-2 text-md font-medium text-gray-800 mb-6">
            {players} Players {addons.length > 0 && `• Add-ons: ${addons.join(" & ")}`}
          </div>

          {/* Share Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={shareWhatsApp}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-green-500 text-white rounded-full shadow hover:opacity-90 transition"
            >
              <ChatBubbleLeftEllipsisIcon className="h-5 w-5" /> Share via WhatsApp
            </button>
            <button
              onClick={shareEmail}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-200 text-gray-800 rounded-full shadow hover:bg-gray-300 transition"
            >
              <EnvelopeIcon className="h-5 w-5" /> Share via Email
            </button>
          </div>
        </div>
        
      </motion.main>

    </div>
  );
}
