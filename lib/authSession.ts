import crypto from "crypto";
import Session from "@/models/Session";
import { parseUserAgent } from "@/lib/userAgent";

/**
 * Records a new device/browser login as a Session document (for the
 * "Active Sessions" list in Account Settings) and returns the sessionId to
 * embed in the signed JWT so it can later be identified as "This Device".
 */
export async function createUserSession(userId: string, req: Request): Promise<string> {
  const sessionId = crypto.randomUUID();
  const uaString = req.headers.get("user-agent");
  const { browser, os, device } = parseUserAgent(uaString);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  try {
    await Session.create({
      userId,
      sessionId,
      device,
      browser,
      os,
      ip,
    });
  } catch (err) {
    console.warn("[Session] Failed to record login session:", err);
  }

  return sessionId;
}
