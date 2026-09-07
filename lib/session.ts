import { cookies } from "next/headers";
import { verifyToken, TokenPayload } from "./auth";
import connectDB from "./mongoose";
import User from "@/models/User";
import Session from "@/models/Session";

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Confirm this token hasn't been revoked — either by a "Log out all
  // devices" action (tokenVersion bump) or by logging out this one specific
  // device (its Session record deleted). DB errors fail open — a transient
  // outage must not mass-log-out every signed-in user.
  if (typeof payload.tokenVersion === "number" || payload.sessionId) {
    try {
      await connectDB();
      const [user, session] = await Promise.all([
        typeof payload.tokenVersion === "number"
          ? User.findById(payload.userId).select("tokenVersion").lean<any>()
          : null,
        payload.sessionId
          ? Session.findOne({ sessionId: payload.sessionId, userId: payload.userId }).lean<any>()
          : null,
      ]);

      if (user && (user.tokenVersion || 0) !== payload.tokenVersion) {
        return null;
      }
      if (payload.sessionId && !session) {
        return null;
      }
    } catch (err) {
      console.warn("[Session] revocation check failed, trusting signed token:", err);
    }
  }

  return payload;
}
