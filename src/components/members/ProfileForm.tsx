"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { useAuth } from "@/lib/auth/AuthProvider";
import { isValidWurderId, normalizePersonName } from "@/lib/auth/auth-helpers";
import { updateUserProfile, UsernameTakenError } from "@/lib/auth/profile-bootstrap";
import { storage } from "@/lib/firebase/client";

type ProfileFormInitialProfile = {
  email: string | null;
  firstName?: string;
  lastName?: string;
  name?: string;
  wurderId?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
};

function readDisplayName(name?: string, firstName?: string, lastName?: string): string {
  if (name?.trim()) return name.trim();
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return full || "Not set";
}

type ProfileFormProps = {
  initialProfile?: ProfileFormInitialProfile;
};

export default function ProfileForm({ initialProfile }: ProfileFormProps) {
  const { user, profile, refreshProfile } = useAuth();
  const activeProfile = profile ?? initialProfile ?? null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState("");
  const [wurderId, setWurderId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarPreviewFailed, setAvatarPreviewFailed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLockedWurderId = Boolean(activeProfile?.wurderId?.trim());

  const compactInputClass =
    "input-dark mt-1.5 h-10 rounded-lg border-white/20 bg-black/30 px-3 py-1.5 text-sm";

  const profileDisplayName = readDisplayName(activeProfile?.name, activeProfile?.firstName, activeProfile?.lastName);
  const profileEmail = activeProfile?.email?.trim() || user?.email?.trim() || "Not available";
  const profileWurderId = activeProfile?.wurderId?.trim() ? `@${activeProfile.wurderId.trim()}` : "Not set";

  useEffect(() => {
    setFirstName(activeProfile?.firstName ?? "");
    setLastName(activeProfile?.lastName ?? "");
    setName(activeProfile?.name ?? "");
    setWurderId(activeProfile?.wurderId ?? "");
    setAvatarUrl(activeProfile?.avatarUrl ?? activeProfile?.avatar ?? "");
    setAvatarPreviewFailed(false);
  }, [activeProfile]);

  useEffect(() => {
    setAvatarPreviewFailed(false);
  }, [avatarUrl]);

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

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
      setError("You must be signed in.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setError("");
    setSuccess("");
    setUploadingAvatar(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}-${safeName}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      setAvatarUrl(url);
      setSuccess("Avatar uploaded. Save profile to apply changes.");
    } catch (uploadError) {
      if (uploadError instanceof Error && uploadError.message.trim()) {
        setError(uploadError.message);
      } else {
        setError("Could not upload avatar.");
      }
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="border-t border-white/10 pt-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Edit Profile</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Identity and account settings</h3>
      <p className="mt-2 max-w-2xl text-sm text-soft">
        Keep your public identity consistent across members, join flow, and hosted sessions.
      </p>

      {error ? (
        <p className="mt-4 border-l-2 border-red-400/60 bg-red-950/35 px-4 py-3 text-sm text-red-100">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-4 border-l-2 border-emerald-400/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
          {success}
        </p>
      ) : null}

      <form className="mt-5 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-7" onSubmit={handleSave}>
        <aside className="border border-white/12 bg-black/20 p-4 lg:sticky lg:top-20 lg:h-fit">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Current profile</p>
          <div className="mt-3 flex items-center gap-3">
            {avatarUrl.trim() && !avatarPreviewFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Profile avatar"
                className="h-14 w-14 rounded-full border border-white/20 object-cover"
                onError={() => setAvatarPreviewFailed(true)}
                onLoad={() => setAvatarPreviewFailed(false)}
              />
            ) : (
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/5 text-lg font-bold text-white">
                {(profileDisplayName[0] ?? "W").toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{profileDisplayName}</p>
              <p className="text-xs text-muted">{profileWurderId}</p>
            </div>
          </div>
          <dl className="mt-4 divide-y divide-white/10 border-y border-white/10 text-sm">
            <div className="py-2.5">
              <dt className="text-xs uppercase tracking-[0.16em] text-muted">Email</dt>
              <dd className="mt-1 truncate text-white">{profileEmail}</dd>
            </div>
            <div className="py-2.5">
              <dt className="text-xs uppercase tracking-[0.16em] text-muted">Wurder ID</dt>
              <dd className="mt-1 text-white">{profileWurderId}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">Changes on the right apply after pressing save.</p>
        </aside>

        <div className="mt-5 space-y-4 lg:mt-0">
          <section className="border-y border-white/10 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Identity</p>
            <div className="mt-2.5 grid gap-3 lg:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-soft">Display name</span>
                <input
                  className={compactInputClass}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={(event) => setName(normalizePersonName(event.target.value))}
                  placeholder="Optional if first + last are set"
                  autoCapitalize="words"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-soft">First name</span>
                <input
                  className={compactInputClass}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  onBlur={(event) => setFirstName(normalizePersonName(event.target.value))}
                  autoComplete="given-name"
                  autoCapitalize="words"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-soft">Last name</span>
                <input
                  className={compactInputClass}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  onBlur={(event) => setLastName(normalizePersonName(event.target.value))}
                  autoComplete="family-name"
                  autoCapitalize="words"
                />
              </label>
            </div>
          </section>

          <section className="border-y border-white/10 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Account handle</p>
            <div className="mt-2.5 grid gap-3 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
              <label className="block">
                <span className="text-sm font-medium text-soft">Wurder ID</span>
                <input
                  className={compactInputClass}
                  value={wurderId}
                  onChange={(event) => setWurderId(event.target.value)}
                  disabled={hasLockedWurderId}
                  placeholder="your_wurder_id"
                  autoCapitalize="none"
                />
                <span className="mt-2 block text-xs text-muted">
                  {hasLockedWurderId
                    ? "Wurder ID is locked after it has been claimed."
                    : "Wurder ID can be claimed once and then becomes locked."}
                </span>
              </label>
              <div className="border border-white/12 bg-black/20 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Avatar image</p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleAvatarFileChange(event)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/20 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/30 disabled:opacity-60"
                  >
                    {uploadingAvatar ? "Uploading..." : "Upload avatar"}
                  </button>
                  <span className="text-xs text-muted">PNG/JPG up to 5MB</span>
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-muted">Changes are saved to your member profile immediately.</p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#C7355D] to-[#8E1F45] px-5 py-2.5 text-sm font-semibold text-white transition hover:from-[#D96A5A] hover:to-[#C7355D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
