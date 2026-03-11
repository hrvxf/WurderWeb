import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readEnv, readPublicEnv } from "@/lib/env";

function readAdminProjectId(): string {
  const projectId =
    readEnv("FIREBASE_ADMIN_PROJECT_ID") ||
    readEnv("GOOGLE_CLOUD_PROJECT") ||
    readPublicEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");

  if (!projectId) {
    throw new Error("Missing Firebase project ID for admin SDK initialization.");
  }

  return projectId;
}

function readAdminCredential(): ReturnType<typeof cert> | null {
  const clientEmail = readEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = readEnv("FIREBASE_ADMIN_PRIVATE_KEY");
  const projectId = readAdminProjectId();

  if (clientEmail && privateKey) {
    return cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });
  }

  const credentialsPath = readEnv("GOOGLE_APPLICATION_CREDENTIALS");
  if (credentialsPath) {
    if (!existsSync(credentialsPath)) {
      throw new Error(`Firebase Admin credentials file not found at ${credentialsPath}.`);
    }

    let parsed: { project_id?: unknown; client_email?: unknown; private_key?: unknown };
    try {
      parsed = JSON.parse(readFileSync(credentialsPath, "utf8")) as {
        project_id?: unknown;
        client_email?: unknown;
        private_key?: unknown;
      };
    } catch (error) {
      throw new Error(
        `Firebase Admin credentials file at ${credentialsPath} is not valid JSON: ${
          error instanceof Error ? error.message : "Unknown parse error."
        }`
      );
    }

    if (
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string"
    ) {
      throw new Error(
        `Firebase Admin credentials file at ${credentialsPath} is missing client_email or private_key.`
      );
    }

    return cert({
      projectId: typeof parsed.project_id === "string" ? parsed.project_id : projectId,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    });
  }

  return null;
}

const credential = readAdminCredential();
const app = getApps()[0] ?? initializeApp({ projectId: readAdminProjectId(), credential: credential ?? undefined });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
