import { signInWithEmailAndPassword, type UserCredential } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { isValidEmail, normalizeEmail } from "@/lib/auth/auth-helpers";

type ResolverSuccessPayload = {
  mode: "email";
  email: string;
};

type ResolverErrorPayload = {
  code?: string;
  message?: string;
};

function normalizeIdentifierInput(identifier: string): {
  raw: string;
  forceUsernameLookup: boolean;
} {
  const raw = identifier.trim();
  const forceUsernameLookup = raw.startsWith("@") && !raw.slice(1).includes("@");
  return {
    raw,
    forceUsernameLookup,
  };
}

async function resolveIdentifierViaApi(identifier: string): Promise<string> {
  const response = await fetch("/api/auth/resolve-login-identifier", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ identifier }),
  });

  const payload = (await response.json().catch(() => ({}))) as ResolverSuccessPayload & ResolverErrorPayload;

  if (!response.ok) {
    if (payload.code === "WURDER_ID_NOT_FOUND") {
      throw new Error("No account found with that Wurder ID.");
    }

    if (payload.code === "INVALID_IDENTIFIER") {
      throw new Error(payload.message || "Email or Wurder ID is required.");
    }

    throw new Error("Unable to resolve that Wurder ID right now. Please sign in with email.");
  }

  if (payload.mode !== "email" || typeof payload.email !== "string" || !payload.email.trim()) {
    throw new Error("Unable to resolve that Wurder ID right now. Please sign in with email.");
  }

  return normalizeEmail(payload.email);
}

export async function resolveLoginIdentifier(identifier: string): Promise<string> {
  const { raw, forceUsernameLookup } = normalizeIdentifierInput(identifier);

  if (!raw) {
    throw new Error("Email or Wurder ID is required.");
  }

  if (!forceUsernameLookup && raw.includes("@")) {
    if (!isValidEmail(raw)) {
      throw new Error("Invalid email format.");
    }
    return normalizeEmail(raw);
  }

  return resolveIdentifierViaApi(raw);
}

export async function loginWithEmailOrWurderId(
  identifier: string,
  password: string
): Promise<UserCredential> {
  if (!password.trim()) {
    throw new Error("Password is required.");
  }

  const email = await resolveLoginIdentifier(identifier);
  return signInWithEmailAndPassword(auth, email, password);
}
