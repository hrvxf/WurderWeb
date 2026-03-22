"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { mapGoogleError, mapLoginError, toAuthErrorCode } from "@/lib/auth/auth-helpers";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

type LoginFormProps = {
  nextPath?: string;
};

export default function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const { loginWithEmailOrWurderId, loginWithGoogle } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password.trim()) {
      setError("Enter your email or Wurder ID and password.");
      return;
    }

    setLoading(true);
    try {
      await loginWithEmailOrWurderId(identifier, password);
      router.replace(nextPath ?? AUTH_ROUTES.members);
    } catch (submitError) {
      const firebaseCode = toAuthErrorCode(submitError);
      if (firebaseCode) {
        setError(mapLoginError(submitError));
      } else if (submitError instanceof Error && submitError.message.trim()) {
        setError(submitError.message);
      } else {
        setError(mapLoginError(submitError));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      router.replace(nextPath ?? AUTH_ROUTES.members);
    } catch (googleError) {
      setError(mapGoogleError(googleError));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="glass-surface mx-auto w-full max-w-xl rounded-3xl p-6 sm:p-8">
      <h1 className="text-3xl font-bold tracking-tight">Member Sign In</h1>
      <p className="mt-2 text-soft">Use your email or Wurder ID linked to your existing account.</p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-400/45 bg-red-950/45 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm text-soft">Email or Wurder ID</span>
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="input-dark mt-2"
            autoComplete="username"
            autoCapitalize="none"
            placeholder="name@example.com or your_wurder_id"
          />
        </label>

        <label className="block">
          <span className="text-sm text-soft">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input-dark mt-2"
            autoComplete="current-password"
            autoCapitalize="none"
            placeholder="Enter your password"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#C7355D] to-[#8E1F45] px-4 py-3 text-sm font-semibold text-white transition hover:from-[#D96A5A] hover:to-[#C7355D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
        <div className="h-px flex-1 bg-white/15" />
        <span>or</span>
        <div className="h-px flex-1 bg-white/15" />
      </div>

      <GoogleSignInButton onClick={handleGoogleSignIn} loading={googleLoading} />

      <p className="mt-6 text-sm text-soft">
        Need an account?{" "}
        <Link className="font-semibold text-white underline-offset-4 hover:underline" href={AUTH_ROUTES.signup}>
          Create one
        </Link>
      </p>
    </div>
  );
}
