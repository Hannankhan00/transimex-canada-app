import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: Request) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  const url = new URL(req.url);
  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // If credentials are not yet configured in .env.local
  if (!googleClientId || googleClientId === "your-google-client-id") {
    return NextResponse.redirect(
      new URL(
        "/login?error=Google+OAuth+keys+are+not+configured+yet.+Please+add+GOOGLE_CLIENT_ID+and+GOOGLE_CLIENT_SECRET+to+.env.local",
        req.url
      )
    );
  }

  // Generate cryptographically secure state parameter to prevent OAuth CSRF (HIGH-04)
  const state = crypto.randomBytes(32).toString("hex");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", googleClientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}

