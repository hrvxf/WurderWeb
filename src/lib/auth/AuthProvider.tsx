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
  DEFAULT_MEMBER_STATS,
  composeMemberData,
  type MemberDataSources,
  type MemberDataWarning,
} from "@/lib/auth/member-stats";
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
  return ensureUserProfile(nextUser);
}

function logAuthContextProfile(uid: string | null, profile: WurderUserProfile | null, source: string): void {
  if (process.env.NODE_ENV === "production") return;
  console.info("MEMBERS_AUTH_CONTEXT_PROFILE", {
    uid,
    source,
    timestamp: new Date().toISOString(),
    profile,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<WurderUserProfile | null>(null);
  const [stats, setStats] = useState(DEFAULT_MEMBER_STATS);
  const [sources, setSources] = useState<MemberDataSources>({
    profile: "accounts/{uid}",
    stats: "fallback-none",
  });
  const [warnings, setWarnings] = useState<MemberDataWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loginWithEmailOrWurderId = useCallback(async (identifier: string, password: string) => {
    await setupBrowserLocalPersistence();
    setProfileLoading(true);
    try {
      const credential = await loginWithIdentifier(identifier, password);
      const nextProfile = await bootstrapProfile(credential.user);
      const memberData = await composeMemberData({
        uid: credential.user.uid,
        profile: nextProfile,
      });
      setUser(credential.user);
      setProfile(memberData.profile);
      setStats(memberData.stats);
      setSources(memberData.sources);
      setWarnings(memberData.warnings);
      logAuthContextProfile(credential.user.uid, nextProfile, "loginWithEmailOrWurderId");
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
      const memberData = await composeMemberData({
        uid: credential.user.uid,
        profile: nextProfile,
      });

      setUser(credential.user);
      setProfile(memberData.profile);
      setStats(memberData.stats);
      setSources(memberData.sources);
      setWarnings(memberData.warnings);
      logAuthContextProfile(credential.user.uid, nextProfile, "signup");
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
      const memberData = await composeMemberData({
        uid: credential.user.uid,
        profile: nextProfile,
      });
      setUser(credential.user);
      setProfile(memberData.profile);
      setStats(memberData.stats);
      setSources(memberData.sources);
      setWarnings(memberData.warnings);
      logAuthContextProfile(credential.user.uid, nextProfile, "loginWithGoogle");
    } finally {
      setProfileLoading(false);
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    clearMemberCaches();
    setUser(null);
    setProfile(null);
    setStats(DEFAULT_MEMBER_STATS);
    setSources({
      profile: "accounts/{uid}",
      stats: "fallback-none",
    });
    setWarnings([]);
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
      const memberData = await composeMemberData({
        uid: currentUser.uid,
        profile: nextProfile,
      });
      setProfile(memberData.profile);
      setStats(memberData.stats);
      setSources(memberData.sources);
      setWarnings(memberData.warnings);
      logAuthContextProfile(currentUser.uid, nextProfile, "refreshProfile");
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
          setProfile(null);
          setStats(DEFAULT_MEMBER_STATS);
          setSources({
            profile: "accounts/{uid}",
            stats: "fallback-none",
          });
          setWarnings([]);
          logAuthContextProfile(null, null, "onAuthStateChanged:signedOut");
          setProfileLoading(false);
          setLoading(false);
          return;
        }

        setProfileLoading(true);
        void bootstrapProfile(nextUser)
          .then(async (nextProfile) => {
            if (!isMounted) return;
            const memberData = await composeMemberData({
              uid: nextUser.uid,
              profile: nextProfile,
            });
            setProfile(memberData.profile);
            setStats(memberData.stats);
            setSources(memberData.sources);
            setWarnings(memberData.warnings);
            logAuthContextProfile(nextUser.uid, nextProfile, "onAuthStateChanged:bootstrap");
          })
          .catch((error) => {
            console.error("[auth] Failed to bootstrap profile", error);
            if (!isMounted) return;
            setProfile(null);
            setStats(DEFAULT_MEMBER_STATS);
            setSources({
              profile: "accounts/{uid}",
              stats: "fallback-none",
            });
            setWarnings([]);
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
      stats,
      sources,
      warnings,
      loginWithEmailOrWurderId,
      signup,
      loginWithGoogle,
      logout,
      refreshProfile,
    }),
    [
      user,
      profile,
      stats,
      sources,
      warnings,
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
