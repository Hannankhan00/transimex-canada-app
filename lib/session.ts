import { cookies } from "next/headers";
import { verifyToken, TokenPayload } from "./auth";
import connectDB from "./mongoose";
import User from "@/models/User";

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // If the token carries a version stamp, confirm it hasn't been revoked by a
  // "Log out all devices" action. DB errors fail open — a transient outage
  // must not mass-log-out every signed-in user.
  if (typeof payload.tokenVersion === "number") {
    try {
      await connectDB();
      const user = await User.findById(payload.userId).select("tokenVersion").lean<any>();
      if (user && (user.tokenVersion || 0) !== payload.tokenVersion) {
        return null;
      }
    } catch (err) {
      console.warn("[Session] tokenVersion check failed, trusting signed token:", err);
    }
  }

  return payload;
}
