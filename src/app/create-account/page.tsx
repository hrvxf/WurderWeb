"use client";

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, setDoc, query, where, getDocs, collection } from "firebase/firestore";
import Button from "@/components/Button";
import Footer from "@/components/Footer";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import capitalize from "@/app/utils/capitalize";
import { motion } from "framer-motion";

export default function CreateAccountPage() {
  const [wurderId, setWurderId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [wurderIdError, setWurderIdError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const router = useRouter();

  const getPasswordStrength = (pass: string) => {
    const checks = {
      length: pass.length >= 6,
      number: /\d/.test(pass),
      upper: /[A-Z]/.test(pass),
    };
    if (!checks.length) return { label: "Weak", color: "bg-red-500", width: "w-1/3" };
    if (checks.length && checks.number && checks.upper && pass.length >= 8)
      return { label: "Strong", color: "bg-green-500", width: "w-full" };
    return { label: "Medium", color: "bg-yellow-500", width: "w-2/3" };
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword === password || confirmPassword === "";

  const validateWurderId = (name: string) => /^[a-zA-Z0-9_]{3,20}$/.test(name);

  useEffect(() => {
    if (wurderId && !validateWurderId(wurderId)) {
      setWurderIdError("Wurder ID must be 3–20 characters (letters, numbers, underscores).");
    } else {
      setWurderIdError("");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError("");
    }

    if (password && password.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
    } else {
      setPasswordError("");
    }
  }, [wurderId, email, password]);

  const handleCreateAccount = async () => {
    setLoading(true);
    setGeneralError("");

    try {
      const rawWurderId = wurderId.trim();
      const wurderIdLower = rawWurderId.toLowerCase();
      const formattedFirst = capitalize(firstName);
      const formattedLast = capitalize(lastName);

      // Check if username taken
      const q = query(collection(db, "users"), where("wurderIdLower", "==", wurderIdLower));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setWurderIdError("This Wurder ID is already taken.");
        setLoading(false);
        return;
      }

      // Create Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: rawWurderId });

      // Reserve username
      await setDoc(doc(db, "usernames", wurderIdLower), {
        uid: user.uid,
        createdAt: new Date().toISOString(),
      });

      // Create profile
      await setDoc(doc(db, "users", user.uid), {
        wurderId: rawWurderId,
        wurderIdLower,
        firstName: formattedFirst,
        lastName: formattedLast,
        email,
        avatar: null,
        stats: { gamesPlayed: 0, kills: 0, deaths: 0, points: 0, streak: 0, mvpAwards: 0 },
        activeGame: null,
        createdAt: new Date().toISOString(),
      });

      router.push("/profile");
    } catch (err: any) {
      console.error("Signup error:", err);
      setGeneralError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      {/* Mobile Header */}
      <div className="sm:hidden flex items-center justify-between bg-white/50 backdrop-blur-md px-4 py-3 shadow">
        <button onClick={() => router.push("/wurder-login")} className="text-blue-600 font-medium">
          ← Back
        </button>
        <h2 className="font-semibold text-lg">Create Account</h2>
        <div className="w-10" />
      </div>

      {/* Animated Form Container */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex justify-center items-start sm:items-center p-4"
      >
        <div className="bg-white/50 text-black rounded-2xl shadow-xl w-full sm:max-w-2xl lg:max-w-5xl backdrop-blur-md flex flex-col lg:flex-row overflow-hidden">
          {/* Left Side – Form */}
          <div className="w-full lg:w-1/2 p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-center mb-6">Create Your Wurder Account</h1>
            {generalError && (
              <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center">{generalError}</p>
            )}

            {/* Account Info */}
            <h3 className="text-lg font-semibold mb-2">Account Info</h3>
            <input
              type="text"
              placeholder="Choose a Username"
              className={`w-full border rounded-lg px-4 py-3 mb-2 text-black placeholder-gray-500 focus:outline-none focus:ring-2 ${
                wurderIdError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-yellow-500"
              }`}
              value={wurderId}
              onChange={(e) => setWurderId(e.target.value)}
            />
            {wurderIdError && <p className="text-red-600 text-sm mb-4">{wurderIdError}</p>}

            <input
              type="email"
              placeholder="Email"
              className={`w-full border rounded-lg px-4 py-3 mb-4 text-black placeholder-gray-500 focus:outline-none focus:ring-2 ${
                emailError ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-yellow-500"
              }`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {emailError && <p className="text-red-600 text-sm mb-4">{emailError}</p>}

            {/* Personal Info */}
            <h3 className="text-lg font-semibold mb-2">Your Details</h3>
            <input
              type="text"
              placeholder="First Name"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Last Name"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />

            {/* Security */}
            <h3 className="text-lg font-semibold mb-2">Security</h3>
            <div className="relative mb-2">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className={`w-full border rounded-lg px-4 py-3 text-black placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  passwordError
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-yellow-500"
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {passwordError && <p className="text-red-600 text-sm mb-2">{passwordError}</p>}
            {password && (
              <div className="mb-4">
                <div className="h-2 w-full bg-gray-200 rounded-full">
                  <div className={`${passwordStrength.color} ${passwordStrength.width} h-2 rounded-full`} />
                </div>
                <p className="text-sm mt-1">{`Password Strength: ${passwordStrength.label}`}</p>
                <ul className="text-xs text-gray-600 mt-2 space-y-1">
                  <li>• At least 6 characters</li>
                  <li>• At least one number</li>
                  <li>• At least one uppercase letter</li>
                </ul>
              </div>
            )}

            <div className="relative mb-6">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                className={`w-full border rounded-lg px-4 py-3 text-black placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  passwordsMatch
                    ? "border-gray-300 focus:ring-yellow-500"
                    : "border-red-500 focus:ring-red-500"
                }`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="flex items-center mb-6">
              <input
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                I agree to the{" "}
                <a href="/terms" className="text-blue-600 hover:underline">
                  Terms & Conditions
                </a>
              </label>
            </div>

            <Button
              onClick={handleCreateAccount}
              disabled={loading}
              className={`w-full py-3 rounded-lg transition ${
                !loading
                  ? "bg-yellow-500 text-black hover:bg-yellow-600"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
            >
              {loading ? "Creating..." : "Create Account"}
            </Button>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{" "}
              <button onClick={() => router.push("/wurder-login")} className="text-blue-600 hover:underline">
                Sign In
              </button>
            </p>
          </div>

          {/* Right Side – Info Panel */}
          <div className="hidden lg:flex w-1/2 bg-white/50 backdrop-blur-md items-center justify-center p-8">
            <div className="text-center max-w-md">
              <h2 className="text-3xl font-bold mb-4 text-yellow-700">Welcome to Wurder</h2>
              <p className="text-gray-700 mb-6">
                Set up your account to join games, track your stats, and be part of epic events. 
                Whether you're playing with friends or hosting a large-scale event, Wurder makes it easy.
              </p>
              <img
                src="/illustrations/hero-signup.svg"
                alt="Wurder illustration"
                className="max-w-xs mx-auto"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
