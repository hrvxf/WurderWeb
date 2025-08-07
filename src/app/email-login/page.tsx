"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import Button from "@/components/Button";

export default function WurderLoginPage() {
  const [wurderId, setWurderId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      if (!wurderId || !password) {
        setError("Please enter your Wurder ID and password.");
        return;
      }

      const q = query(collection(db, "users"), where("wurderIdLower", "==", wurderId.toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setError("No account found with that Wurder ID.");
        return;
      }

      const email = snap.docs[0].data().email;
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/profile");
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[url('/parchment-bg.jpg')] bg-cover">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-gray-900 text-2xl font-bold mb-4">Log in with Wurder ID</h1>
        {error && <p className="text-red-600 mb-3">{error}</p>}

        <input
          type="text"
          placeholder="Wurder ID"
          value={wurderId}
          onChange={(e) => setWurderId(e.target.value)}
          className="w-full border border-gray-300 text-gray-900 placeholder-gray-500 p-2 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 text-gray-900 placeholder-gray-500 p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />

        <Button onClick={handleLogin} className="bg-yellow-600 hover:bg-yellow-700 w-full">
          Log In
        </Button>

        <p className="mt-4 text-sm text-gray-700">
          New here?{" "}
          <a href="/create-account" className="text-yellow-700 font-semibold hover:underline">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}
