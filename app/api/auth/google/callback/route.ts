import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { signToken } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorParam)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=Authorization+code+missing", req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        "/login?error=Google+Client+Secret+not+configured+in+.env.local",
        req.url
      )
    );
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Google token exchange error:", tokenData);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            tokenData.error_description || "Failed to exchange Google token"
          )}`,
          req.url
        )
      );
    }

    // 2. Fetch user information from Google API
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const googleUser = await userInfoResponse.json();

    if (!userInfoResponse.ok || !googleUser.email) {
      return NextResponse.redirect(
        new URL("/login?error=Failed+to+fetch+Google+profile", req.url)
      );
    }

    // 3. Connect to Database & Find/Create User
    await connectDB();

    let user = await User.findOne({ email: googleUser.email.toLowerCase() });

    if (!user) {
      user = await User.create({
        name: googleUser.name || "Client User",
        email: googleUser.email.toLowerCase(),
        companyName: "Laurentian Global Logistics Ltd.",
        role: "client",
        googleId: googleUser.sub,
        avatar: googleUser.picture,
        provider: "google",
        isVerified: true,
      });
    } else {
      // Update Google ID and avatar if needed
      if (!user.googleId) user.googleId = googleUser.sub;
      if (googleUser.picture && !user.avatar) user.avatar = googleUser.picture;
      await user.save();
    }

    // 4. Generate JWT Token
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      companyName: user.companyName || "Laurentian Global Logistics Ltd.",
      role: user.role || "client",
    };

    const token = signToken(tokenPayload);

    // 5. Create redirect response and set cookie
    const response = NextResponse.redirect(new URL("/dashboard", req.url));

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Google Auth Callback Exception:", err);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          err.message || "An unexpected error occurred during Google sign in"
        )}`,
        req.url
      )
    );
  }
}
