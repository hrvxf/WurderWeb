"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { isValidWurderId } from "@/lib/auth/auth-helpers";
import { updateUserProfile, UsernameTakenError } from "@/lib/auth/profile-bootstrap";

export default function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState("");
  const [wurderId, setWurderId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasLockedWurderId = Boolean(profile?.wurderId?.trim());

  useEffect(() => {
    setFirstName(profile?.firstName ?? "");
    setLastName(profile?.lastName ?? "");
    setName(profile?.name ?? "");
    setWurderId(profile?.wurderId ?? "");
    setAvatarUrl(profile?.avatarUrl ?? profile?.avatar ?? "");
  }, [profile]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("You must be signed in.");
      return;
    }

    const candidateName = name.trim();
    const candidateFirstName = firstName.trim();
    const candidateLastName = lastName.trim();
    const candidateWurderId = wurderId.trim();

    if (!candidateName && !(candidateFirstName && candidateLastName)) {
      setError("Add a full name or first and last name.");
      return;
    }

    if (!hasLockedWurderId && !candidateWurderId) {
      setError("Wurder ID is required.");
      return;
    }

    if (!hasLockedWurderId && candidateWurderId && !isValidWurderId(candidateWurderId)) {
      setError("Wurder ID must be 3-20 characters using letters, numbers, or underscores.");
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        firstName: candidateFirstName,
        lastName: candidateLastName,
        name: candidateName,
        avatar: avatarUrl.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        wurderId: hasLockedWurderId ? undefined : candidateWurderId,
      });
      await refreshProfile();
      setSuccess("Profile saved.");
    } catch (saveError) {
      if (saveError instanceof UsernameTakenError) {
        setError("That Wurder ID is already taken.");
      } else if (saveError instanceof Error && saveError.message.trim()) {
        setError(saveError.message);
      } else {
        setError("Could not save your profile.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-surface rounded-3xl p-6 sm:p-8">
      <h2 className="text-2xl font-semibold">Profile Completion</h2>
      <p className="mt-2 text-soft">Complete required fields to unlock all member pages.</p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-400/45 bg-red-950/45 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-xl border border-emerald-400/45 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
          {success}
        </p>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={handleSave}>
        <label className="block">
          <span className="text-sm text-soft">Display name</span>
          <input
            className="input-dark mt-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Optional if first + last are set"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-soft">First name</span>
            <input
              className="input-dark mt-2"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
            />
          </label>

          <label className="block">
            <span className="text-sm text-soft">Last name</span>
            <input
              className="input-dark mt-2"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-soft">Wurder ID</span>
          <input
            className="input-dark mt-2"
            value={wurderId}
            onChange={(event) => setWurderId(event.target.value)}
            disabled={hasLockedWurderId}
            placeholder="your_wurder_id"
          />
          <span className="mt-2 block text-sm text-muted">
            {hasLockedWurderId
              ? "Wurder ID is locked after it has been claimed."
              : "Set once. Username collisions are checked before save."}
          </span>
        </label>

        <label className="block">
          <span className="text-sm text-soft">Avatar URL</span>
          <input
            className="input-dark mt-2"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://..."
          />
        </label>

        {avatarUrl.trim() ? (
          <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted">Avatar Preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt="Avatar preview"
              className="mt-3 h-20 w-20 rounded-full border border-white/20 object-cover"
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#C7355D] to-[#8E1F45] px-4 py-3 text-sm font-semibold text-white transition hover:from-[#D96A5A] hover:to-[#C7355D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
