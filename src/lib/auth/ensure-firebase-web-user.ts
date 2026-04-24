import { signInAnonymously, type User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { setupBrowserLocalPersistence } from "@/lib/auth/session";

export async function ensureFirebaseWebUser(): Promise<User> {
  await setupBrowserLocalPersistence();

  const currentUser = auth.currentUser;
  if (currentUser) return currentUser;

  const credential = await signInAnonymously(auth);
  return credential.user;
}
