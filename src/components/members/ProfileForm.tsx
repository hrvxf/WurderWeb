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

type ProfileStep = 1 | 2;
type HandleAvailabilityState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" }
  | { status: "error"; message: string };

type ProfileFormProps = {
  initialProfile?: ProfileFormInitialProfile;
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/png", "image/jpeg"]);

function readDisplayName(name?: string, firstName?: string, lastName?: string): string {
  if (name?.trim()) return name.trim();
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return full || "Not set";
}

export default function ProfileForm({ initialProfile }: ProfileFormProps) {
  const { user, profile, refreshProfile } = useAuth();
  const activeProfile = profile ?? initialProfile ?? null;

  const [step, setStep] = useState<ProfileStep>(1);
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
  const [acknowledgeHandleLock, setAcknowledgeHandleLock] = useState(false);
  const [handleAvailability, setHandleAvailability] = useState<HandleAvailabilityState>({ status: "idle" });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLockedWurderId = Boolean(activeProfile?.wurderId?.trim());

  const compactInputClass =
    "input-dark mt-1.5 h-10 rounded-lg border-white/20 bg-black/30 px-3 py-1.5 text-sm";

  const profileDisplayName = readDisplayName(activeProfile?.name, activeProfile?.firstName, activeProfile?.lastName);
  const profileEmail = activeProfile?.email?.trim() || user?.email?.trim() || "Not available";
  const profileWurderId = activeProfile?.wurderId?.trim() ? `@${activeProfile.wurderId.trim()}` : "Not set";

  const candidateName = name.trim();
  const candidateFirstName = firstName.trim();
  const candidateLastName = lastName.trim();
  const candidateWurderId = wurderId.trim();

  const hasIdentityInput = Boolean(candidateName || (candidateFirstName && candidateLastName));
  const hasWurderIdInput = Boolean(hasLockedWurderId || candidateWurderId);
  const wurderIdLooksValid = !candidateWurderId || isValidWurderId(candidateWurderId);
  const wurderIdTaken = !hasLockedWurderId && handleAvailability.status === "taken";
  const requiresHandleConfirmation = !hasLockedWurderId && Boolean(candidateWurderId);
  const handleConfirmationReady = !requiresHandleConfirmation || acknowledgeHandleLock;
  const handleAvailabilityReady =
    hasLockedWurderId ||
    !candidateWurderId ||
    !wurderIdLooksValid ||
    handleAvailability.status === "available" ||
    handleAvailability.status === "idle";
  const canContinueIdentity = hasIdentityInput && hasWurderIdInput && wurderIdLooksValid && !wurderIdTaken;
  const canSaveProfile = canContinueIdentity && handleConfirmationReady && handleAvailabilityReady && !uploadingAvatar;

  useEffect(() => {
    setStep(1);
    setFirstName(activeProfile?.firstName ?? "");
    setLastName(activeProfile?.lastName ?? "");
    setName(activeProfile?.name ?? "");
    setWurderId(activeProfile?.wurderId ?? "");
    setAvatarUrl(activeProfile?.avatarUrl ?? activeProfile?.avatar ?? "");
    setAvatarPreviewFailed(false);
    setAcknowledgeHandleLock(false);
    setHandleAvailability({ status: "idle" });
  }, [activeProfile]);

  useEffect(() => {
    setAvatarPreviewFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (hasLockedWurderId) {
      setAcknowledgeHandleLock(false);
    }
  }, [hasLockedWurderId]);

  useEffect(() => {
    if (hasLockedWurderId || !candidateWurderId || !wurderIdLooksValid) {
      setHandleAvailability({ status: "idle" });
      return;
    }
    if (!user) {
      setHandleAvailability({ status: "error", message: "Sign in to check Wurder ID availability." });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        setHandleAvailability({ status: "checking" });
        try {
          const token = await user.getIdToken();
          const response = await fetch(
            `/api/members/wurder-id/availability?wurderId=${encodeURIComponent(candidateWurderId)}`,
            {
              headers: { authorization: `Bearer ${token}` },
              signal: controller.signal,
            }
          );
          const payload = (await response.json().catch(() => ({}))) as {
            available?: unknown;
            message?: string;
          };
          if (cancelled) return;
          if (!response.ok) {
            setHandleAvailability({
              status: "error",
              message: payload.message ?? "Unable to check Wurder ID right now.",
            });
            return;
          }
          setHandleAvailability(payload.available === true ? { status: "available" } : { status: "taken" });
        } catch (availabilityError) {
          if (cancelled) return;
          if (availabilityError instanceof Error && availabilityError.name === "AbortError") return;
          setHandleAvailability({ status: "error", message: "Unable to check Wurder ID right now." });
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [candidateWurderId, hasLockedWurderId, user, wurderIdLooksValid]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) {
      continueToStepTwo();
      return;
    }
    setError("");
    setSuccess("");

    if (!user) {
      setError("You must be signed in.");
      return;
    }

    if (!candidateName && !(candidateFirstName && candidateLastName)) {
      setError("Add a full name or first and last name.");
      setStep(1);
      return;
    }

    if (!hasLockedWurderId && !candidateWurderId) {
      setError("Wurder ID is required.");
      setStep(1);
      return;
    }

    if (!hasLockedWurderId && candidateWurderId && !isValidWurderId(candidateWurderId)) {
      setError("Wurder ID must be 3-20 characters using letters, numbers, or underscores.");
      setStep(1);
      return;
    }

    if (!hasLockedWurderId && handleAvailability.status === "taken") {
      setError("That Wurder ID is already taken.");
      setStep(1);
      return;
    }

    if (!hasLockedWurderId && candidateWurderId && !acknowledgeHandleLock) {
      setError("Confirm that your Wurder ID will be locked after this save.");
      setStep(1);
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
      setAcknowledgeHandleLock(false);
    } catch (saveError) {
      if (saveError instanceof UsernameTakenError) {
        setError("That Wurder ID is already taken.");
        setStep(1);
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

    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      setError("Avatar must be a PNG or JPG file.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setError("Avatar must be 5MB or less.");
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

  function continueToStepTwo() {
    setError("");
    setSuccess("");
    if (!canContinueIdentity) {
      if (!hasIdentityInput) {
        setError("Add a full name or first and last name.");
      } else if (!hasWurderIdInput) {
        setError("Wurder ID is required.");
      } else if (wurderIdTaken) {
        setError("That Wurder ID is already taken.");
      } else {
        setError("Wurder ID must be 3-20 characters using letters, numbers, or underscores.");
      }
      return;
    }
    setStep(2);
  }

  return (
    <div className="border-t border-white/10 pt-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Edit Profile</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Identity and account settings</h3>
      <p className="mt-2 max-w-2xl text-sm text-soft">
        Keep your public identity consistent across members, join flow, and hosted sessions.
      </p>

      <div className="surface-panel-muted mt-4 p-3">
        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-muted">
          <span>Step {step} of 2</span>
          <span>{step === 1 ? "Identity" : "Avatar + review"}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
              step === 1
                ? "border-[#D96A5A]/50 bg-[#D96A5A]/15 text-white"
                : "border-white/15 bg-black/20 text-soft hover:bg-black/30"
            }`}
          >
            1. Identity
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!canContinueIdentity}
            className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition disabled:opacity-60 ${
              step === 2
                ? "border-[#D96A5A]/50 bg-[#D96A5A]/15 text-white"
                : "border-white/15 bg-black/20 text-soft hover:bg-black/30"
            }`}
          >
            2. Avatar + review
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 border-l-2 border-red-400/60 bg-red-950/35 px-4 py-3 text-sm text-red-100">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-4 border-l-2 border-emerald-400/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
          {success}
        </p>
      ) : null}

      <form className="mt-5 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-7" onSubmit={handleSave}>
        <aside className="surface-panel-muted p-4 lg:sticky lg:top-20 lg:h-fit">
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
          <p className="mt-3 text-xs text-muted">Changes apply after pressing save in step 2.</p>
        </aside>

        <div className="mt-5 space-y-4 lg:mt-0">
          {step === 1 ? (
            <>
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
                    {!wurderIdLooksValid ? (
                      <span className="mt-2 block text-xs text-red-300">
                        Use 3-20 characters, letters, numbers, or underscores only.
                      </span>
                    ) : null}
                    {!hasLockedWurderId && candidateWurderId && wurderIdLooksValid ? (
                      <span
                        className={`mt-2 block text-xs ${
                          handleAvailability.status === "available"
                            ? "text-emerald-300"
                            : handleAvailability.status === "taken"
                              ? "text-red-300"
                              : handleAvailability.status === "error"
                                ? "text-amber-200"
                                : "text-muted"
                        }`}
                      >
                        {handleAvailability.status === "checking"
                          ? "Checking Wurder ID availability..."
                          : handleAvailability.status === "available"
                            ? "Wurder ID is available."
                            : handleAvailability.status === "taken"
                              ? "That Wurder ID is already taken."
                              : handleAvailability.status === "error"
                                ? handleAvailability.message
                                : "Wurder ID availability will be checked before save."}
                      </span>
                    ) : null}
                  </label>
                  <div className="surface-panel-muted p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Step guidance</p>
                    <p className="mt-2 text-sm text-soft">
                      Set identity and handle in this step, then continue to upload avatar and save.
                    </p>
                    {requiresHandleConfirmation ? (
                      <label className="mt-3 flex items-start gap-2 text-xs text-amber-100">
                        <input
                          type="checkbox"
                          checked={acknowledgeHandleLock}
                          onChange={(event) => setAcknowledgeHandleLock(event.target.checked)}
                          className="mt-0.5"
                        />
                        <span>I understand this Wurder ID will be locked after save.</span>
                      </label>
                    ) : null}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="border-y border-white/10 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Avatar and review</p>
              <div className="mt-2.5 grid gap-3 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                <div className="surface-panel-muted p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Avatar image</p>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(event) => void handleAvatarFileChange(event)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className="control-secondary min-h-9 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {uploadingAvatar ? "Uploading..." : "Upload avatar"}
                    </button>
                    <span className="text-xs text-muted">PNG/JPG up to 5MB</span>
                  </div>
                </div>
                <div className="surface-panel-muted p-3 text-sm text-soft">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Save checklist</p>
                  <ul className="mt-2 space-y-1.5">
                    <li>{hasIdentityInput ? "Identity: ready" : "Identity: add name details"}</li>
                    <li>{hasWurderIdInput ? "Wurder ID: ready" : "Wurder ID: required"}</li>
                    <li>
                      {hasLockedWurderId || !candidateWurderId
                        ? "Wurder ID availability: ready"
                        : handleAvailability.status === "checking"
                          ? "Wurder ID availability: checking"
                          : handleAvailability.status === "available"
                            ? "Wurder ID availability: ready"
                            : handleAvailability.status === "taken"
                              ? "Wurder ID availability: resolve"
                              : handleAvailability.status === "error"
                                ? "Wurder ID availability: retry"
                                : "Wurder ID availability: ready"}
                    </li>
                    <li>
                      {requiresHandleConfirmation && !acknowledgeHandleLock
                        ? "Handle lock confirmation: required"
                        : "Handle lock confirmation: ready"}
                    </li>
                    <li>{uploadingAvatar ? "Avatar upload: in progress" : "Avatar upload: ready"}</li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          <div className="sticky bottom-3 z-10 rounded-xl border border-white/15 bg-[rgba(12,12,16,0.94)] p-3 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">Step {step} of 2</p>
              <div className="flex flex-wrap items-center gap-2">
                {step === 2 ? (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="control-secondary min-h-10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Back
                  </button>
                ) : null}

                {step === 1 ? (
                  <button
                    type="button"
                    onClick={continueToStepTwo}
                    disabled={!canContinueIdentity}
                    className="control-secondary min-h-10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Continue to avatar
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving || !canSaveProfile}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#C7355D] to-[#8E1F45] px-5 py-2.5 text-sm font-semibold text-white transition hover:from-[#D96A5A] hover:to-[#C7355D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save profile"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

