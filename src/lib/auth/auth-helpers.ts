const WURDER_ID_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Invalid email format.",
  "auth/invalid-credential": "Invalid email, Wurder ID, or password.",
  "auth/user-not-found": "No account found for this login.",
  "auth/wrong-password": "Invalid email, Wurder ID, or password.",
  "auth/network-request-failed": "Network issue. Try again.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/popup-blocked": "Popup blocked. Allow popups and try again.",
  "auth/popup-closed-by-user": "Google sign-in was canceled.",
  "auth/cancelled-popup-request": "Google sign-in was canceled.",
};

const SIGNUP_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "Email is already in use.",
  "auth/invalid-email": "Invalid email format.",
  "auth/weak-password": "Password is too weak.",
  "auth/network-request-failed": "Network issue. Try again.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
};

type FirebaseErrorLike = {
  code?: string;
  message?: string;
};

export function toAuthErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as FirebaseErrorLike).code;
  return typeof code === "string" ? code : null;
}

export function mapLoginError(error: unknown): string {
  const code = toAuthErrorCode(error);
  if (code && LOGIN_ERROR_MESSAGES[code]) return LOGIN_ERROR_MESSAGES[code];
  return "Login failed. Please try again.";
}

export function mapSignupError(error: unknown): string {
  const code = toAuthErrorCode(error);
  if (code && SIGNUP_ERROR_MESSAGES[code]) return SIGNUP_ERROR_MESSAGES[code];
  return "Sign up failed. Please try again.";
}

export function mapGoogleError(error: unknown): string {
  const code = toAuthErrorCode(error);
  if (code && LOGIN_ERROR_MESSAGES[code]) return LOGIN_ERROR_MESSAGES[code];
  return "Google sign-in failed. Please try again.";
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeWurderId(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePersonName(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((word) =>
      word
        .split(/([-'])/g)
        .map((segment) => {
          if (!segment || segment === "-" || segment === "'") return segment;
          return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
        })
        .join("")
    )
    .join(" ");
}

export function isValidWurderId(value: string): boolean {
  return WURDER_ID_REGEX.test(value.trim());
}

export function buildName(firstName?: string, lastName?: string): string {
  const first = normalizePersonName(firstName ?? "");
  const last = normalizePersonName(lastName ?? "");
  return `${first} ${last}`.trim();
}
