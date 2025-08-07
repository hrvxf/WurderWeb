"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function PriceSection({
  price,
  players,
  addons,
}: {
  price: number;
  players: number;
  addons: string[];
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDesktop(window.innerWidth > 768);
    }
  }, []);

  return (
    <div className="space-y-1">
      <motion.div
        key={price}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: 1,
          boxShadow: "0 0 8px rgba(255,215,0,0.6)",
        }}
        transition={{ duration: 0.3 }}
        className="text-xl font-bold text-gray-900 flex items-center gap-2 rounded"
      >
        Total: £{price}
        <span className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500 cursor-pointer"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            onClick={() => !isDesktop && setShowTooltip(!showTooltip)}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          
        </span>
      </motion.div>
      
    </div>
  );
}
