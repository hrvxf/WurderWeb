"use client";

import React from "react";
import Image from "next/image";
import Button from "@/components/Button";
import {
  ShoppingCartIcon,
  ListBulletIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";

interface HeroCardProps {
  profileImage: string;
  firstName: string;
  lastName: string;
  wurderId: string;
  level: number;
  rankName: string;
  rankColor: string;
  xpWidth: number;
  xpCurrent: number;
  xpToNext: number;
  nextRank: { name: string; at: number | null };
  roleInfo?: { name: string; icon: React.ReactNode; color: string } | null;
  onEdit: () => void;
  onBuy: () => void;
  onPurchases: () => void;
}

export default function HeroCard({
  profileImage,
  firstName,
  lastName,
  wurderId,
  level,
  rankName,
  rankColor,
  xpWidth,
  xpCurrent,
  xpToNext,
  nextRank,
  roleInfo,
  onEdit,
  onBuy,
  onPurchases,
}: HeroCardProps) {
  return (
    <div className="bg-white/50 backdrop-blur-md rounded-3xl shadow-xl p-8 border-2 border-yellow-400 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Avatar + Info */}
        <div className="flex items-center gap-6">
          <div className="relative flex flex-col items-center">
            <div className="rounded-full border-[6px] border-yellow-400 shadow-lg p-1 relative z-10">
              <Image
                src={profileImage}
                alt="Avatar"
                width={160}
                height={160}
                className="rounded-full"
              />
            </div>
            <span
              className={`absolute -bottom-4 left-1/2 -translate-x-1/2 ${rankColor} text-white text-xs px-4 py-1 rounded-full shadow-lg animate-pulse-glow z-20`}
            >
              Level {level}
            </span>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              {firstName} {lastName}
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Wurder ID:{" "}
              <span className="font-medium text-gray-800">{wurderId}</span>
            </p>
            <p className="text-sm text-gray-700 font-medium mt-1">
              Rank: {rankName}
            </p>
            {roleInfo && (
              <p
                className={`mt-2 inline-flex items-center gap-2 text-white text-xs px-3 py-1 rounded-full shadow-md ${roleInfo.color}`}
              >
                {roleInfo.icon} {roleInfo.name}
              </p>
            )}
            {/* XP Progress Bar */}
            <div className="mt-5 w-52 bg-gray-200 rounded-full h-3 overflow-hidden relative">
              <div
                className="h-3 transition-all duration-700 ease-out bg-gradient-to-r from-yellow-400 to-yellow-600"
                style={{ width: `${xpWidth}%` }}
              ></div>
              <span className="absolute right-0 -top-1 text-yellow-600 text-xs">
                ★
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {xpCurrent} / {xpToNext} XP – Next: {nextRank.name} at{" "}
              {nextRank.at || "∞"} points
            </p>
          </div>
        </div>

        {/* Buttons to the right */}
        <div className="flex flex-col md:flex-row gap-3">
          <Button
            onClick={onBuy}
            className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 text-sm px-5 py-2 rounded-full flex items-center gap-2 shadow-md"
          >
            <ShoppingCartIcon className="h-4 w-4" /> Buy Code
          </Button>
          <Button
            onClick={onPurchases}
            className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 text-sm px-5 py-2 rounded-full flex items-center gap-2 shadow-md"
          >
            <ListBulletIcon className="h-4 w-4" /> Purchases
          </Button>
          <Button
            onClick={onEdit}
            className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 text-sm px-5 py-2 rounded-full flex items-center gap-2 shadow-md"
          >
            <PencilIcon className="h-4 w-4" /> Edit
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulseGlow {
          0%,
          100% {
            box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 18px rgba(255, 215, 0, 0.95);
          }
        }
        .animate-pulse-glow {
          animation: pulseGlow 2s infinite;
        }
      `}</style>
    </div>
  );
}
