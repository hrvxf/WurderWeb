"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, storage, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import EditProfileModal from "./EditProfileModal";
import HeroCard from "./HeroCard";
import Image from "next/image";
import Button from "@/components/Button";
import {
  TrophyIcon,
  FireIcon,
  StarIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  BoltIcon,
} from "@heroicons/react/24/solid";
import { onAuthStateChanged } from "firebase/auth";

const placeholderAvatar = "/profile-placeholder.png";

// --- Types ---
interface UserStats {
  points: number;
  kills: number;
  deaths: number;
  streak: number;
  mvpAwards: number;
  gamesPlayed: number;
}

interface User {
  firstName: string;
  lastName: string;
  avatar?: string;
  wurderId: string;
  role?: keyof typeof roleData;
  stats: UserStats;
}

// --- Role Data ---
const roleData: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  Wurderer: { name: "Wurderer", icon: <ExclamationTriangleIcon className="h-4 w-4" />, color: "bg-red-600" },
  Traitor: { name: "Traitor", icon: <FireIcon className="h-4 w-4" />, color: "bg-purple-600" },
  Gamesmaster: { name: "Gamesmaster", icon: <StarIcon className="h-4 w-4" />, color: "bg-yellow-500" },
};

// --- Rank Logic ---
const getRankName = (points: number): string => {
  if (points >= 2000) return "King";
  if (points >= 1000) return "Master";
  if (points >= 500) return "Assassin";
  if (points >= 100) return "Apprentice";
  return "Novice";
};

const getNextRank = (points: number): { name: string; at: number | null } => {
  if (points < 100) return { name: "Apprentice", at: 100 };
  if (points < 500) return { name: "Assassin", at: 500 };
  if (points < 1000) return { name: "Master", at: 1000 };
  if (points < 2000) return { name: "King", at: 2000 };
  return { name: "Max Rank", at: null };
};

const rankColors: Record<string, string> = {
  Novice: "bg-gray-500",
  Apprentice: "bg-green-500",
  Assassin: "bg-red-600",
  Master: "bg-purple-600",
  King: "bg-yellow-500",
};

export default function PlayerProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [wurderId, setWurderId] = useState("");
  const [xpWidth, setXpWidth] = useState(0);
  const router = useRouter();

  // --- Load User
  useEffect(() => {
    const loadUser = async (uid: string) => {
      try {
        const userRef = doc(db, "users", uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = snapshot.data() as User;
          setUser(data);
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setAvatar(data.avatar || "");
          setWurderId(data.wurderId || "");
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadUser(user.uid);
      } else {
        setLoading(false);
        setUser(null);
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // --- Animate XP Bar
  useEffect(() => {
    const points = user?.stats?.points || 0;
    const xpCurrent = points % 100;
    const timeout = setTimeout(() => {
      setXpWidth((xpCurrent / 100) * 100);
    }, 200);
    return () => clearTimeout(timeout);
  }, [user]);

  // --- Save
  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await setDoc(doc(db, "users", uid), { firstName, lastName, avatar }, { merge: true });
      setUser((prev) => ({ ...prev!, firstName, lastName, avatar }));
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to save changes. Please try again.");
    }
  };

  if (loading) return <p className="text-center text-gray-500">Loading profile...</p>;
  if (!user) return <p className="text-center text-red-500">Failed to load profile.</p>;

  // --- Calculated values
  const profileImage = avatar || user.avatar || placeholderAvatar;
  const points = user.stats.points;
  const level = Math.floor(points / 100) + 1;
  const xpCurrent = points % 100;
  const xpToNext = 100;
  const rankName = getRankName(points);
  const nextRank = getNextRank(points);
  const role = user.role || null;
  const roleInfo = role ? roleData[role] : null;

  const badges = [
    { name: "MVP", icon: StarIcon, desc: "Earned MVP in a game", condition: (u: User) => u.stats.mvpAwards > 0 },
    { name: "Kill Streak", icon: FireIcon, desc: "3+ kills in a row", condition: (u: User) => u.stats.streak >= 3 },
    { name: "Veteran", icon: TrophyIcon, desc: "Played 10+ games", condition: (u: User) => u.stats.gamesPlayed >= 10 },
  ];
  const unlockedBadges = badges.filter((badge) => badge.condition(user));
  const lockedBadges = badges.filter((badge) => !badge.condition(user));

  return (
    <div className="min-h-screen p-6 flex flex-col gap-10">
      <HeroCard
        profileImage={profileImage}
        firstName={firstName}
        lastName={lastName}
        wurderId={wurderId}
        level={level}
        rankName={rankName}
        rankColor={rankColors[rankName]}
        xpWidth={xpWidth}
        xpCurrent={xpCurrent}
        xpToNext={xpToNext}
        nextRank={nextRank}
        roleInfo={roleInfo}
        onEdit={() => setIsModalOpen(true)}
        onBuy={() => router.push("/buy")}
        onPurchases={() => router.push("/purchases")}
      />

      {/* --- STATS + BADGES + HISTORY --- */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* --- STATS --- */}
        <div className="md:w-1/3">
          <div className="bg-white/50 backdrop-blur-md rounded-xl shadow-md border border-yellow-400 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Game Stats</h2>
            <div className="grid grid-cols-2 gap-y-4 text-center">
              {[
                { label: "Games", value: user.stats.gamesPlayed, icon: ChartBarIcon, color: "text-yellow-500" },
                { label: "Points", value: points, icon: BoltIcon, color: "text-yellow-500" },
                { label: "Kills", value: user.stats.kills, icon: BoltIcon, color: "text-green-600" },
                { label: "Deaths", value: user.stats.deaths, icon: ExclamationTriangleIcon, color: "text-red-600" },
                { label: "Streak", value: user.stats.streak, icon: FireIcon, color: "text-orange-500" },
                { label: "MVPs", value: user.stats.mvpAwards, icon: StarIcon, color: "text-yellow-500" },
              ].map((stat, idx) => (
                <div key={idx}>
                  <stat.icon className={`mx-auto h-5 w-5 ${stat.color} mb-1`} />
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- BADGES + GAME HISTORY --- */}
        <div className="md:w-2/3 flex flex-col gap-8">
          <div className="bg-white/50 backdrop-blur-md rounded-xl shadow-md border border-yellow-400 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrophyIcon className="h-6 w-6 text-yellow-500" /> Badges
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {unlockedBadges.map((badge, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 shadow-inner flex flex-col items-center animate-shine">
                  <badge.icon className="h-10 w-10 text-yellow-500" />
                  <p className="mt-2 font-medium">{badge.name}</p>
                  <p className="text-xs text-gray-500 text-center">{badge.desc}</p>
                </div>
              ))}
              {lockedBadges.map((badge, idx) => (
                <div key={idx} className="bg-gray-200 rounded-xl p-4 shadow-inner flex flex-col items-center opacity-50">
                  <badge.icon className="h-10 w-10 text-gray-400" />
                  <p className="mt-2 font-medium">{badge.name}</p>
                  <p className="text-xs text-gray-400 text-center">Locked</p>
                </div>
              ))}
            </div>
          </div>

          {/* --- GAME HISTORY --- */}
          <div className="bg-white/50 backdrop-blur-md rounded-xl shadow-md border border-yellow-400 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Game History</h2>
            <div className="bg-white rounded-xl p-4 overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">Date</th>
                    <th className="p-2">Game Code</th>
                    <th className="p-2">Points</th>
                    <th className="p-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {[{ date: "2025-08-01", code: "ABCD1234", points: "+10", role: "Traitor" },
                    { date: "2025-07-28", code: "EFGH5678", points: "+5", role: "Wurderer" }].map((game, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-100 cursor-pointer">
                      <td className="p-2">{game.date}</td>
                      <td className="p-2">{game.code}</td>
                      <td className="p-2">{game.points}</td>
                      <td className="p-2 flex items-center gap-2">
                        {roleData[game.role]?.icon}
                        <span>{game.role}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL --- */}
      {user && (
        <EditProfileModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          firstName={user.firstName}
          lastName={user.lastName}
          avatar={user.avatar || ""}
          onProfileUpdated={(newUrl) => {
            setAvatar(newUrl);
            setUser((prev) => ({ ...prev!, avatar: newUrl }));
          }}
        />
      )}

      <style jsx>{`
        @keyframes shine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shine {
          background: linear-gradient(90deg, #fff 25%, #ffe680 50%, #fff 75%);
          background-size: 200% auto;
          animation: shine 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
