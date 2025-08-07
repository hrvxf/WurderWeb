import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function findUserByUsername(username: string): Promise<{ uid: string; email: string } | null> {
  try {
    const usernameLower = username.toLowerCase().trim();
    const usernameDoc = await getDoc(doc(db, "usernames", usernameLower));

    if (!usernameDoc.exists()) {
      console.log("[findUserByUsername] No username doc found for:", usernameLower);
      return null;
    }

    const uid = usernameDoc.data().uid;
    const userDoc = await getDoc(doc(db, "users", uid));

    if (!userDoc.exists()) {
      console.log("[findUserByUsername] No user doc found for uid:", uid);
      return null;
    }

    const email = userDoc.data().email;
    if (!email) {
      console.log("[findUserByUsername] User exists but has no email field:", uid);
      return null;
    }

    return { uid, email };
  } catch (err) {
    console.error("[findUserByUsername] Error:", err);
    return null;
  }
}
