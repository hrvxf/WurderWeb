#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

function parseArgs(argv) {
  const options = {
    apply: false,
    limit: Number.POSITIVE_INFINITY,
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(parsed) && parsed > 0) options.limit = parsed;
    }
  }
  return options;
}

function loadLocalEnv(rootDir) {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function normalizeStats(stats) {
  const fallback = {
    gamesPlayed: 0,
    kills: 0,
    deaths: 0,
    wins: 0,
    streak: 0,
    points: 0,
    pointsLifetime: 0,
    mvpAwards: 0,
  };

  if (!stats || typeof stats !== "object") return fallback;
  return { ...fallback, ...stats };
}

function mapProfileStats(profileData) {
  const lifetimePoints = typeof profileData.lifetimePoints === "number" ? profileData.lifetimePoints : 0;
  const lifetimeDefeats =
    typeof profileData.lifetimeDefeats === "number"
      ? profileData.lifetimeDefeats
      : typeof profileData.lifetimeCaught === "number"
        ? profileData.lifetimeCaught
        : typeof profileData.lifetimeDeaths === "number"
          ? profileData.lifetimeDeaths
          : typeof profileData.deaths === "number"
            ? profileData.deaths
            : 0;
  return normalizeStats({
    gamesPlayed: typeof profileData.gamesPlayed === "number" ? profileData.gamesPlayed : 0,
    kills: typeof profileData.lifetimeKills === "number" ? profileData.lifetimeKills : 0,
    wins: typeof profileData.lifetimeWins === "number" ? profileData.lifetimeWins : 0,
    deaths: lifetimeDefeats,
    streak: typeof profileData.bestStreak === "number" ? profileData.bestStreak : 0,
    points: lifetimePoints,
    pointsLifetime: lifetimePoints,
  });
}

function score(stats) {
  return Object.values(normalizeStats(stats)).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  loadLocalEnv(rootDir);

  const credentialsPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(rootDir, "secrets", "firebase-admin.json");
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Service account file not found at "${credentialsPath}"`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    serviceAccount.project_id;

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  }

  const db = getFirestore();
  const summary = {
    scanned: 0,
    usersMissing: 0,
    needsUpdate: 0,
    updated: 0,
  };

  console.log(
    `[backfill-user-stats-from-profiles] Starting (${options.apply ? "APPLY" : "DRY RUN"}) for project ${projectId}`
  );

  let profilesQuery = db.collection("profiles");
  if (Number.isFinite(options.limit)) {
    profilesQuery = profilesQuery.limit(options.limit);
  }
  const profilesSnap = await profilesQuery.get();

  for (const profileDoc of profilesSnap.docs) {
    summary.scanned += 1;
    const uid = profileDoc.id;
    const legacyStats = mapProfileStats(profileDoc.data());

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      summary.usersMissing += 1;
      continue;
    }

    const currentStats = normalizeStats(userDoc.data().stats);
    if (score(legacyStats) <= score(currentStats)) {
      continue;
    }

    summary.needsUpdate += 1;

    if (options.apply) {
      await userRef.set(
        {
          stats: legacyStats,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      summary.updated += 1;
    }
  }

  console.log("[backfill-user-stats-from-profiles] Complete");
  console.log(`- scanned profiles: ${summary.scanned}`);
  console.log(`- users missing: ${summary.usersMissing}`);
  console.log(`- users needing update: ${summary.needsUpdate}`);
  console.log(`- users updated: ${summary.updated}`);
}

main().catch((error) => {
  console.error("[backfill-user-stats-from-profiles] Failed");
  console.error(error);
  process.exitCode = 1;
});
