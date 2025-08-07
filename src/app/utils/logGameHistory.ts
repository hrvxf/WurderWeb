import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function logGameHistory(uid: string, gameData: any) {
  const gameRef = doc(db, `users/${uid}/games/${gameData.gameId}`);
  await setDoc(gameRef, {
    gameId: gameData.gameId,
    gameName: gameData.gameName || "Unnamed Game",
    joinedAt: gameData.joinedAt || new Date().toISOString(),
    leftAt: gameData.leftAt || null,
    pointsEarned: gameData.pointsEarned || 0,
    kills: gameData.kills || 0,
    deaths: gameData.deaths || 0,
    result: gameData.result || "loss",
    role: gameData.role || "player",
    guild: gameData.guild || null
  });
}
