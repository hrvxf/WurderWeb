"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { isValidWurderId, mapSignupError } from "@/lib/auth/auth-helpers";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

export default function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [wurderId, setWurderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const wurderIdLooksValid = useMemo(() => {
    if (!wurderId.trim()) return true;
    return isValidWurderId(wurderId);
  }, [wurderId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (wurderId.trim() && !isValidWurderId(wurderId)) {
      setError("Wurder ID must be 3-20 characters using letters, numbers, or underscores.");
      return;
    }

    setLoading(true);
    try {
      await signup({
        email,
        password,
        firstName,
        lastName,
        wurderId: wurderId.trim() || undefined,
      });
      router.replace(AUTH_ROUTES.members);
    } catch (signupError) {
      if (signupError instanceof Error && signupError.message.trim()) {
        setError(signupError.message);
      } else {
        setError(mapSignupError(signupError));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-surface mx-auto w-full max-w-xl rounded-3xl p-6 sm:p-8">
      <h1 className="text-3xl font-bold tracking-tight">Create Member Account</h1>
      <p className="mt-2 text-soft">Uses the same Wurder identity across app and web.</p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-400/45 bg-red-950/45 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm text-soft">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input-dark mt-2"
            placeholder="name@example.com"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm text-soft">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input-dark mt-2"
            placeholder="At least 6 characters"
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-soft">First name</span>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="input-dark mt-2"
              autoComplete="given-name"
              placeholder="Alex"
            />
          </label>

          <label className="block">
            <span className="text-sm text-soft">Last name</span>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="input-dark mt-2"
              autoComplete="family-name"
              placeholder="Mason"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-soft">Desired Wurder ID</span>
          <input
            value={wurderId}
            onChange={(event) => setWurderId(event.target.value)}
            className="input-dark mt-2"
            autoComplete="username"
            placeholder="your_wurder_id"
          />
          {!wurderIdLooksValid ? (
            <span className="mt-2 block text-sm text-red-300">
              Use 3-20 characters, letters/numbers/underscores only.
            </span>
          ) : (
            <span className="mt-2 block text-sm text-muted">
              This can only be set once in the current web flow.
            </span>
          )}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#C7355D] to-[#8E1F45] px-4 py-3 text-sm font-semibold text-white transition hover:from-[#D96A5A] hover:to-[#C7355D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-soft">
        Already a member?{" "}
        <Link className="font-semibold text-white underline-offset-4 hover:underline" href={AUTH_ROUTES.login}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
