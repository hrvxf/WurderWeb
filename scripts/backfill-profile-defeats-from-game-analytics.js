#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

function parseArgs(argv) {
  const options = {
    apply: false,
    limit: Number.POSITIVE_INFINITY,
    includeActive: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (arg === "--include-active") {
      options.includeActive = true;
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

function asFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asNonEmptyString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveDefeats(row) {
  const keys = [
    "defeats",
    "caught",
    "timesCaught",
    "timesDefeated",
    "successfulClaimsAgainst",
    "deaths",
    "deathCount",
  ];
  for (const key of keys) {
    const value = asFiniteNumber(row[key]);
    if (value == null) continue;
    return Math.max(0, value);
  }
  return 0;
}

function resolveUid(row, keyFallback) {
  const keys = ["uid", "userId", "playerUid", "playerId", "id"];
  for (const key of keys) {
    const value = asNonEmptyString(row[key]);
    if (value) return value;
  }
  return asNonEmptyString(keyFallback);
}

function normalizePlayerRows(playerPerformance) {
  if (Array.isArray(playerPerformance)) {
    return playerPerformance
      .map((item) => (item && typeof item === "object" ? item : null))
      .filter(Boolean);
  }

  if (playerPerformance && typeof playerPerformance === "object") {
    return Object.entries(playerPerformance).map(([playerId, value]) => {
      if (value && typeof value === "object") {
        return { playerId, ...value };
      }
      return { playerId };
    });
  }

  return [];
}

function isCompletedSession(analytics) {
  const overview = analytics && typeof analytics.overview === "object" ? analytics.overview : {};
  const status = asNonEmptyString(overview.status);
  const endedAt = overview.endedAt;
  if (status && status.toLowerCase() === "ended") return true;
  return Boolean(endedAt);
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
    scannedAnalyticsDocs: 0,
    completedDocsUsed: 0,
    playerRowsScanned: 0,
    profilesUpdated: 0,
    profilesConsidered: 0,
  };

  console.log(
    `[backfill-profile-defeats-from-game-analytics] Starting (${options.apply ? "APPLY" : "DRY RUN"}) for project ${projectId}`
  );

  let analyticsQuery = db.collection("gameAnalytics");
  if (Number.isFinite(options.limit)) {
    analyticsQuery = analyticsQuery.limit(options.limit);
  }
  const analyticsSnap = await analyticsQuery.get();
  const totalsByUid = new Map();

  for (const analyticsDoc of analyticsSnap.docs) {
    summary.scannedAnalyticsDocs += 1;
    const analytics = analyticsDoc.data() || {};
    if (!options.includeActive && !isCompletedSession(analytics)) {
      continue;
    }
    summary.completedDocsUsed += 1;

    const rows = normalizePlayerRows(analytics.playerPerformance);
    for (const row of rows) {
      summary.playerRowsScanned += 1;
      const uid = resolveUid(row, null);
      if (!uid) continue;

      const defeats = resolveDefeats(row);
      if (defeats <= 0) continue;
      totalsByUid.set(uid, (totalsByUid.get(uid) || 0) + defeats);
    }
  }

  for (const [uid, defeatedTotal] of totalsByUid.entries()) {
    summary.profilesConsidered += 1;
    const profileRef = db.collection("profiles").doc(uid);
    const profileDoc = await profileRef.get();
    const profile = profileDoc.exists ? profileDoc.data() || {} : {};

    const current =
      asFiniteNumber(profile.lifetimeDefeats) ??
      asFiniteNumber(profile.lifetimeCaught) ??
      asFiniteNumber(profile.lifetimeDeaths) ??
      asFiniteNumber(profile.deaths) ??
      0;

    if (defeatedTotal <= current) {
      continue;
    }

    if (options.apply) {
      await profileRef.set(
        {
          lifetimeDefeats: defeatedTotal,
          lifetimeCaught: defeatedTotal,
          lifetimeDeaths: defeatedTotal,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      summary.profilesUpdated += 1;
    }
  }

  console.log("[backfill-profile-defeats-from-game-analytics] Complete");
  console.log(`- scanned analytics docs: ${summary.scannedAnalyticsDocs}`);
  console.log(`- completed docs used: ${summary.completedDocsUsed}`);
  console.log(`- player rows scanned: ${summary.playerRowsScanned}`);
  console.log(`- profiles considered: ${summary.profilesConsidered}`);
  console.log(`- profiles updated: ${summary.profilesUpdated}`);
  console.log(`- mode filter: ${options.includeActive ? "include active docs" : "completed docs only"}`);
}

main().catch((error) => {
  console.error("[backfill-profile-defeats-from-game-analytics] Failed");
  console.error(error);
  process.exitCode = 1;
});
