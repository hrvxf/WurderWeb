import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { readEnv, readPublicEnv } from "@/lib/env";

const REQUIRED_FIREBASE_ENV = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

function readFirebaseEnv(key: (typeof REQUIRED_FIREBASE_ENV)[number]): string | undefined {
  const publicValue = readPublicEnv(key)?.trim();
  if (publicValue) return publicValue;

  // Allow server-only aliases in API/build environments.
  const serverAlias = key.replace("NEXT_PUBLIC_", "");
  const serverValue = readEnv(serverAlias)?.trim();
  return serverValue || undefined;
}

const firebaseEnvMap: Record<(typeof REQUIRED_FIREBASE_ENV)[number], string | undefined> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  NEXT_PUBLIC_FIREBASE_APP_ID: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
};

const missingFirebaseEnv = REQUIRED_FIREBASE_ENV.filter((key) => !firebaseEnvMap[key]);

if (missingFirebaseEnv.length > 0) {
  throw new Error(
    `[firebase] Missing required Firebase env vars: ${missingFirebaseEnv.join(", ")}.`
  );
}

const FIREBASE_MEASUREMENT_ID = readPublicEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID")?.trim();

const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseEnvMap.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: firebaseEnvMap.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseEnvMap.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: firebaseEnvMap.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnvMap.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseEnvMap.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
