import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const REQUIRED_FIREBASE_ENV = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const FIREBASE_MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const FIREBASE_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

const firebaseEnvMap: Record<(typeof REQUIRED_FIREBASE_ENV)[number], string | undefined> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: FIREBASE_APP_ID,
};

const firebaseConfig: FirebaseOptions = {
  apiKey: FIREBASE_API_KEY ?? "demo-api-key",
  authDomain: FIREBASE_AUTH_DOMAIN ?? "demo.firebaseapp.com",
  projectId: FIREBASE_PROJECT_ID ?? "demo",
  storageBucket: FIREBASE_STORAGE_BUCKET ?? "demo.appspot.com",
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID ?? "000000000000",
  appId: FIREBASE_APP_ID ?? "1:000000000000:web:0000000000000000000000",
  measurementId: FIREBASE_MEASUREMENT_ID,
};

const missingFirebaseEnv = REQUIRED_FIREBASE_ENV.filter((key) => !firebaseEnvMap[key]);

if (typeof window !== "undefined" && missingFirebaseEnv.length > 0) {
  console.warn(
    `[firebase] Missing required Firebase env vars: ${missingFirebaseEnv.join(", ")}.`
  );
}

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
