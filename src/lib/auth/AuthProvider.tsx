"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import { auth, googleProvider } from "@/lib/firebase";
import { buildName, normalizeEmail } from "@/lib/auth/auth-helpers";
import {
  ensureUserProfile,
  fetchUserProfile,
  updateUserProfile,
  UsernameTakenError,
} from "@/lib/auth/profile-bootstrap";
import { clearMemberCaches, setupBrowserLocalPersistence } from "@/lib/auth/session";
import { loginWithEmailOrWurderId as loginWithIdentifier } from "@/lib/auth/username-login";
import type { AuthContextValue, SignupInput } from "@/lib/types/auth";
import type { WurderUserProfile } from "@/lib/types/user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function bootstrapProfile(nextUser: User): Promise<WurderUserProfile> {
  const ensured = await ensureUserProfile(nextUser);
  const fetched = await fetchUserProfile(nextUser.uid);
  return fetched ?? ensured;
}

async function syncServerSessionCookie(nextUser: User | null): Promise<void> {
  try {
    if (!nextUser) {
      await fetch("/api/auth/session", { method: "DELETE" });
      return;
    }

    const token = await nextUser.getIdToken();
    await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] Failed to sync server session cookie", error);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<WurderUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loginWithEmailOrWurderId = useCallback(async (identifier: string, password: string) => {
    await setupBrowserLocalPersistence();
    setProfileLoading(true);
    try {
      const credential = await loginWithIdentifier(identifier, password);
      const nextProfile = await bootstrapProfile(credential.user);
      setUser(credential.user);
      setProfile(nextProfile);
    } finally {
      setProfileLoading(false);
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    await setupBrowserLocalPersistence();
    const email = normalizeEmail(input.email);
    const name = buildName(input.firstName, input.lastName);

    setProfileLoading(true);

    const credential = await createUserWithEmailAndPassword(auth, email, input.password);

    try {
      let nextProfile = await ensureUserProfile(credential.user, {
        firstName: input.firstName,
        lastName: input.lastName,
        name: name || undefined,
      });

      const candidateWurderId = input.wurderId?.trim();
      if (candidateWurderId) {
        nextProfile = await updateUserProfile(credential.user.uid, {
          wurderId: candidateWurderId,
        });
      }

      setUser(credential.user);
      setProfile(nextProfile);
    } catch (error) {
      if (error instanceof UsernameTakenError) {
        await deleteUser(credential.user).catch(() => undefined);
        await signOut(auth).catch(() => undefined);
      }
      throw error;
    } finally {
      setProfileLoading(false);
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await setupBrowserLocalPersistence();
    setProfileLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const nextProfile = await ensureUserProfile(credential.user, {
        name: credential.user.displayName ?? undefined,
        avatar: credential.user.photoURL ?? null,
      });
      setUser(credential.user);
      setProfile(nextProfile);
    } finally {
      setProfileLoading(false);
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    await syncServerSessionCookie(null);
    clearMemberCaches();
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setProfile(null);
      return;
    }

    setProfileLoading(true);
    try {
      const fetched = await fetchUserProfile(currentUser.uid);
      const nextProfile = fetched ?? (await ensureUserProfile(currentUser));
      setProfile(nextProfile);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void = () => {};

    void (async () => {
      try {
        await setupBrowserLocalPersistence();
      } catch (error) {
        console.error("[auth] Failed to set browser persistence", error);
      }

      if (!isMounted) return;

      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        if (!isMounted) return;

        setUser(nextUser);

        if (!nextUser) {
          void syncServerSessionCookie(null);
          setProfile(null);
          setProfileLoading(false);
          setLoading(false);
          return;
        }

        void syncServerSessionCookie(nextUser);
        setProfileLoading(true);
        void bootstrapProfile(nextUser)
          .then((nextProfile) => {
            if (!isMounted) return;
            setProfile(nextProfile);
          })
          .catch((error) => {
            console.error("[auth] Failed to bootstrap profile", error);
            if (!isMounted) return;
            setProfile(null);
          })
          .finally(() => {
            if (!isMounted) return;
            setProfileLoading(false);
            setLoading(false);
          });
      });
    })();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      isAuthenticated: Boolean(user),
      loginWithEmailOrWurderId,
      signup,
      loginWithGoogle,
      logout,
      refreshProfile,
    }),
    [
      user,
      profile,
      loading,
      profileLoading,
      loginWithEmailOrWurderId,
      signup,
      loginWithGoogle,
      logout,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
