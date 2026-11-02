import crypto from "crypto";
import { NextResponse, after } from "next/server";
import { signToken } from "@/lib/auth";
import { recordLoginDevice } from "@/lib/accountSecurity";
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

/**
 * Final step of a password login: records the session, signs the JWT and sets the cookie. Shared by the plain login
 * route and the 2FA routes so every path issues an identical session. `extra` is merged into the JSON body.
 */
export async function completeLogin(
  user: any,
  req: Request,
  rememberMe: boolean,
  extra: Record<string, unknown> = {}
): Promise<NextResponse> {
  const sessionId = await createUserSession(user._id.toString(), req);
  after(() => recordLoginDevice(user, req));

  const tokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    companyName: user.companyName,
    role: user.role || "client",
    permissions: user.permissions || [],
    sessionId,
    tokenVersion: user.tokenVersion || 0,
    // Only present while true, so every other login keeps exactly the token it had before.
    ...(user.mustChangePassword ? { mustChangePassword: true } : {}),
  };

  // Cookie and JWT lifetime are kept in sync — rememberMe = 30 days, else 7 days
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
  const token = signToken(tokenPayload, rememberMe ? "30d" : "7d");

  const response = NextResponse.json({
    success: true,
    message: "Login successful",
    user: tokenPayload,
    ...extra,
  });
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
  return response;
}
