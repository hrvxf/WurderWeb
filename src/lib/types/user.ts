export type WurderUserStats = {
  gamesPlayed?: number;
  kills?: number;
  deaths?: number;
  wins?: number;
  streak?: number;
  streakBest?: number;
  points?: number;
  pointsLifetime?: number;
  mvpAwards?: number;
};

export type WurderUserProfile = {
  uid: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
  name?: string;
  wurderId?: string;
  wurderIdLower?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  avatarPath?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  activeGame?: unknown | null;
  stats?: WurderUserStats;
  achievementIds?: string[];
  achievementBadgeAssetKeys?: Record<string, string>;
  achievements?: {
    achievementIds?: string[];
    achievementBadgeAssetKeys?: Record<string, string>;
    [key: string]: unknown;
  };
  awards?: {
    achievementIds?: string[];
    achievementBadgeAssetKeys?: Record<string, string>;
    [key: string]: unknown;
  };
  roles?: {
    admin?: boolean;
    moderator?: boolean;
  };
  onboarding?: {
    profileComplete?: boolean;
  };
  debugProfileResolution?: {
    rawAccountFields?: Record<string, string | undefined> | null;
    sourcePaths?: string[];
    snapshotAt?: string;
  };
};

export type UsernameLookup = {
  username?: string;
  usernameLower: string;
  uid?: string;
  email?: string;
  createdAt?: unknown;
};

export const DEFAULT_PROFILE_STATS: Required<
  Pick<
    WurderUserStats,
    "gamesPlayed" | "kills" | "deaths" | "wins" | "streak" | "points" | "pointsLifetime" | "mvpAwards"
  >
> = {
  gamesPlayed: 0,
  kills: 0,
  deaths: 0,
  wins: 0,
  points: 0,
  pointsLifetime: 0,
  streak: 0,
  mvpAwards: 0,
};
