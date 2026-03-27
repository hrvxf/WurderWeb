#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { FieldPath, FieldValue, getFirestore } = require("firebase-admin/firestore");

function parseArgs(argv) {
  const options = {
    apply: false,
    batchSize: 300,
    limit: Number.POSITIVE_INFINITY,
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (arg.startsWith("--batch-size=")) {
      const parsed = Number.parseInt(arg.slice("--batch-size=".length), 10);
      if (Number.isFinite(parsed) && parsed > 0) options.batchSize = Math.min(parsed, 500);
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

function resolveCredentialsPath(rootDir) {
  const credsPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(rootDir, "secrets", "firebase-admin.json");
  if (!fs.existsSync(credsPath)) {
    throw new Error(
      `Service account file not found at "${credsPath}". Set GOOGLE_APPLICATION_CREDENTIALS or place credentials at secrets/firebase-admin.json.`
    );
  }
  return credsPath;
}

function normalizeGameType(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "b2c" || normalized === "personal") return "b2c";
  if (normalized === "b2b" || normalized === "business") return "b2b";
  return null;
}

function inferGameTypeFromGameDoc(data) {
  const explicit = normalizeGameType(data.gameType);
  if (explicit) return explicit;
  return typeof data.orgId === "string" && data.orgId.trim() ? "b2b" : "b2c";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  loadLocalEnv(rootDir);

  const credentialsPath = resolveCredentialsPath(rootDir);
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
    needsUpdate: 0,
    updated: 0,
    normalizedLegacyValue: 0,
    inferredFromOrgId: 0,
    inferredAsB2c: 0,
  };

  console.log(
    `[backfill-games-game-type] Starting (${options.apply ? "APPLY" : "DRY RUN"}) for project ${projectId}`
  );

  let lastDoc = null;

  while (summary.scanned < options.limit) {
    let query = db.collection("games").orderBy(FieldPath.documentId()).limit(options.batchSize);
    if (lastDoc) query = query.startAfter(lastDoc.id);

    const snap = await query.get();
    if (snap.empty) break;

    lastDoc = snap.docs[snap.docs.length - 1];
    const writes = [];

    for (const doc of snap.docs) {
      if (summary.scanned >= options.limit) break;
      summary.scanned += 1;
      const data = doc.data() || {};
      const currentType = normalizeGameType(data.gameType);
      const nextType = inferGameTypeFromGameDoc(data);

      if (!currentType) {
        if (typeof data.orgId === "string" && data.orgId.trim()) summary.inferredFromOrgId += 1;
        else summary.inferredAsB2c += 1;
      } else if (currentType !== data.gameType) {
        summary.normalizedLegacyValue += 1;
      }

      if (currentType === nextType && data.gameType === nextType) continue;

      summary.needsUpdate += 1;

      if (options.apply) {
        writes.push(
          doc.ref.set(
            {
              gameType: nextType,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
        );
      }
    }

    if (writes.length > 0) {
      await Promise.all(writes);
      summary.updated += writes.length;
    }
  }

  console.log("[backfill-games-game-type] Complete");
  console.log(`- scanned games: ${summary.scanned}`);
  console.log(`- needing update: ${summary.needsUpdate}`);
  console.log(`- updated: ${summary.updated}`);
  console.log(`- normalized legacy values: ${summary.normalizedLegacyValue}`);
  console.log(`- inferred from orgId: ${summary.inferredFromOrgId}`);
  console.log(`- inferred as b2c: ${summary.inferredAsB2c}`);
}

main().catch((error) => {
  console.error("[backfill-games-game-type] Failed");
  console.error(error);
  process.exitCode = 1;
});
