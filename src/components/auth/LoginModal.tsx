"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- Helper: Lookup user by username ---
async function findUserByUsername(username: string): Promise<{ uid: string; email: string } | null> {
  try {
    const usernameLower = username.toLowerCase().trim();
    const usernameDoc = await getDoc(doc(db, "usernames", usernameLower));

    if (!usernameDoc.exists()) {
      console.log("[findUserByUsername] No username doc found for:", usernameLower);
      return null;
    }

    const uid = usernameDoc.data().uid;
    const userDoc = await getDoc(doc(db, "users", uid));

    if (!userDoc.exists()) {
      console.log("[findUserByUsername] No user doc found for uid:", uid);
      return null;
    }

    const email = userDoc.data().email;
    if (!email) {
      console.log("[findUserByUsername] User exists but has no email field:", uid);
      return null;
    }

    return { uid, email };
  } catch (err) {
    console.error("[findUserByUsername] Error:", err);
    return null;
  }
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const usernameRef = useRef<HTMLInputElement | null>(null);

  // Autofocus
  useEffect(() => {
    if (isOpen && usernameRef.current) usernameRef.current.focus();
  }, [isOpen]);

  // --- Finalize Login ---
  const finalizeLogin = async (uid: string, name: string, avatar: string | null, email?: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      const baseProfile = {
        firstName: "",
        lastName: "",
        email: email || "",
        avatar: avatar || null,
        stats: { gamesPlayed: 0, kills: 0, deaths: 0, points: 0, streak: 0, mvpAwards: 0 },
        activeGame: null,
        createdAt: new Date().toISOString(),
      };

      if (!userSnap.exists()) {
        await setDoc(userRef, baseProfile);
        router.push("/setup-profile");
      } else {
        const data = userSnap.data();
        await setDoc(userRef, { avatar, email: data.email || email || "" }, { merge: true });
        if (!data.firstName || !data.lastName || !data.email) {
          router.push("/setup-profile");
        } else {
          router.push("/profile");
        }
      }
    } catch (err) {
      console.error("Login finalization failed:", err);
      setError("Could not complete login. Please try again.");
    }
  };

  // --- Combined Login (Username or Email) ---
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      if (!usernameOrEmail || !password) {
        setError("Please enter your Username/Email and Password.");
        return;
      }

      let emailToUse = usernameOrEmail;

      // If it's a username (no @), look up in /usernames
      if (!usernameOrEmail.includes("@")) {
        const userData = await findUserByUsername(usernameOrEmail);
        if (!userData) {
          setError("No account found with that Username.");
          return;
        }
        emailToUse = userData.email;
      }

      // Persistent login
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, emailToUse, password);
      onClose();
      router.push("/profile");
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === "auth/wrong-password") setError("Incorrect password.");
      else if (err.code === "auth/user-not-found") setError("No account found with that Email.");
      else setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Forgot Password ---
  const handlePasswordReset = async () => {
    try {
      setError("");
      setInfo("");

      let emailToReset: string | null = usernameOrEmail;

      // If username, look up their email
      if (!usernameOrEmail.includes("@")) {
        const userData = await findUserByUsername(usernameOrEmail);
        emailToReset = userData?.email || null;
      }

      if (!emailToReset) {
        setError("Could not find account to reset password.");
        return;
      }

      await sendPasswordResetEmail(auth, emailToReset);
      setInfo("Password reset email sent. Check your inbox.");
    } catch (err) {
      console.error("Password reset failed:", err);
      setError("Failed to send password reset email.");
    }
  };

  // --- Google Login ---
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await finalizeLogin(
        result.user.uid,
        result.user.displayName || "Google User",
        result.user.photoURL,
        result.user.email || ""
      );
      onClose();
    } catch (err) {
      console.error("Google login failed:", err);
      setError("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white shadow-xl w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl p-8 text-center relative flex flex-col"
      >
        <h2 className="text-black text-2xl font-bold mb-4">Log In to Wurder</h2>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        {info && <p className="text-green-600 mb-4">{info}</p>}

        <input
          ref={usernameRef}
          type="text"
          placeholder="Username or Email"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          className="w-full border text-black border-gray-300 rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />

        {/* Password with Show/Hide toggle */}
        <div className="relative mb-2">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border text-black border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <button
            type="button"
            className="absolute right-3 top-3 text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex justify-between text-sm text-blue-600 mb-4">
          <button onClick={handlePasswordReset} className="hover:underline">
            Forgot password?
          </button>
        </div>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-yellow-500 text-black py-3 rounded-lg hover:bg-yellow-600 mb-6"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>

        {/* Separator */}
        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-3 text-gray-500 text-sm">Or log in with</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center bg-white border border-gray-300 py-3 rounded-full shadow-sm hover:bg-gray-50 mb-6"
        >
          <img src="/icons/google.svg" alt="Google" className="w-6 h-6 mr-3" />
          <span className="text-base font-semibold text-gray-700">Continue with Google</span>
        </button>

        {/* Create Account */}
        <p className="mt-auto text-gray-600 text-sm">
          Don’t have an account?{" "}
          <button
            onClick={() => {
              onClose();
              router.push("/create-account");
            }}
            className="text-blue-600 font-semibold hover:underline"
          >
            Create one
          </button>
        </p>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </motion.div>
    </div>
  );
}
