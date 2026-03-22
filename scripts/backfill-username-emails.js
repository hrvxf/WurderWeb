#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldPath, getFirestore } = require("firebase-admin/firestore");

function parseArgs(argv) {
  const options = {
    apply: false,
    limit: Number.POSITIVE_INFINITY,
    batchSize: 300,
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(parsed) && parsed > 0) options.limit = parsed;
      continue;
    }
    if (arg.startsWith("--batch-size=")) {
      const parsed = Number.parseInt(arg.slice("--batch-size=".length), 10);
      if (Number.isFinite(parsed) && parsed > 0) options.batchSize = parsed;
    }
  }

  return options;
}

function loadLocalEnv(rootDir) {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  loadLocalEnv(rootDir);

  const credsPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(rootDir, "secrets", "firebase-admin.json");

  if (!fs.existsSync(credsPath)) {
    throw new Error(
      `Service account file not found at "${credsPath}". Set GOOGLE_APPLICATION_CREDENTIALS or place file at secrets/firebase-admin.json.`
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credsPath, "utf8"));
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    serviceAccount.project_id;

  if (!projectId) {
    throw new Error("Missing Firebase project id. Set FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  }

  const db = getFirestore();
  const auth = getAuth();
  const userCache = new Map();

  const summary = {
    scanned: 0,
    withEmailAlready: 0,
    missingUid: 0,
    resolved: 0,
    updated: 0,
    unresolved: 0,
  };

  console.log(
    `[backfill-username-emails] Starting (${options.apply ? "APPLY" : "DRY RUN"}) for project ${projectId}`
  );

  let lastDocId = null;
  let reachedLimit = false;

  while (!reachedLimit) {
    let query = db.collection("usernames").orderBy(FieldPath.documentId()).limit(options.batchSize);
    if (lastDocId) {
      query = query.startAfter(lastDocId);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const docSnap of snapshot.docs) {
      summary.scanned += 1;
      if (summary.scanned > options.limit) {
        reachedLimit = true;
        break;
      }

      const data = docSnap.data();
      const existingEmail = normalizeEmail(data.email);
      if (existingEmail) {
        summary.withEmailAlready += 1;
        continue;
      }

      const uid = typeof data.uid === "string" ? data.uid.trim() : "";
      if (!uid) {
        summary.missingUid += 1;
        continue;
      }

      let resolvedEmail = userCache.get(uid);
      if (resolvedEmail === undefined) {
        resolvedEmail = "";

        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
          resolvedEmail = normalizeEmail(userDoc.data()?.email);
        }

        if (!resolvedEmail) {
          const accountDoc = await db.collection("accounts").doc(uid).get();
          if (accountDoc.exists) {
            resolvedEmail =
              normalizeEmail(accountDoc.data()?.email) || normalizeEmail(accountDoc.data()?.mail);
          }
        }

        if (!resolvedEmail) {
          try {
            const authUser = await auth.getUser(uid);
            resolvedEmail = normalizeEmail(authUser.email);
          } catch (_error) {
            resolvedEmail = "";
          }
        }

        userCache.set(uid, resolvedEmail);
      }

      if (!resolvedEmail) {
        summary.unresolved += 1;
        continue;
      }

      summary.resolved += 1;
      if (options.apply) {
        await docSnap.ref.set({ email: resolvedEmail }, { merge: true });
        summary.updated += 1;
      }
    }

    lastDocId = snapshot.docs[snapshot.docs.length - 1].id;
  }

  console.log("[backfill-username-emails] Complete");
  console.log(`- scanned: ${summary.scanned}`);
  console.log(`- already had email: ${summary.withEmailAlready}`);
  console.log(`- missing uid: ${summary.missingUid}`);
  console.log(`- resolved email: ${summary.resolved}`);
  console.log(`- updated: ${summary.updated}`);
  console.log(`- unresolved: ${summary.unresolved}`);
}

main().catch((error) => {
  console.error("[backfill-username-emails] Failed");
  console.error(error);
  process.exitCode = 1;
});
