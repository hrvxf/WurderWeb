import type { User } from "firebase/auth";

import type { WurderUserProfile } from "@/lib/types/user";

export type SignupInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  wurderId?: string;
};

export type AuthContextValue = {
  user: User | null;
  profile: WurderUserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  isAuthenticated: boolean;
  loginWithEmailOrWurderId: (identifier: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};
