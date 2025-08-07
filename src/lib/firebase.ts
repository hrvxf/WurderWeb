// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage"; // <-- ADD THIS

const firebaseConfig = {
  apiKey: "AIzaSyC-i_Png_toiAvtjJYazKO_BVlxIhwYW2g",
  authDomain: "saboteours.firebaseapp.com",
  projectId: "saboteours",
  storageBucket: "saboteours.appspot.com",
  messagingSenderId: "382933132996",
  appId: "1:382933132996:web:41bd0faa7903a11e228b91",
  measurementId: "G-7MKLM8JR4V",
};

// Prevent re-initializing on hot reload
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestore
export const db = getFirestore(app);

// Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");

// Storage
export const storage = getStorage(app); // <-- NOW YOU CAN IMPORT THIS
