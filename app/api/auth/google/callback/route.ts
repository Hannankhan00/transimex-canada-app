import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { signToken } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { isStaffRole } from "@/lib/rbac";
import { createUserSession } from "@/lib/authSession";
import { recordLoginDevice } from "@/lib/accountSecurity";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const stateParam = url.searchParams.get("state");

  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Verify OAuth CSRF state parameter (HIGH-04)
  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;

  if (!stateParam || !savedState || stateParam !== savedState) {
    const errorRes = NextResponse.redirect(
      new URL("/login?error=Invalid+or+expired+OAuth+session+(CSRF+protection)", req.url)
    );
    errorRes.cookies.delete("oauth_state");
    return errorRes;
  }

  if (errorParam) {
    const errorRes = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorParam)}`, req.url)
    );
    errorRes.cookies.delete("oauth_state");
    return errorRes;
  }

  if (!code) {
    const errorRes = NextResponse.redirect(
      new URL("/login?error=Authorization+code+missing", req.url)
    );
    errorRes.cookies.delete("oauth_state");
    return errorRes;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const errorRes = NextResponse.redirect(
      new URL(
        "/login?error=Google+Client+Secret+not+configured+in+.env.local",
        req.url
      )
    );
    errorRes.cookies.delete("oauth_state");
    return errorRes;
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

    // Connecting Google from account settings: attach it to the signed-in account, never sign in as someone else.
    if (cookieStore.get("oauth_link")?.value === "1") {
      const back = (q: string) => {
        const r = NextResponse.redirect(new URL(`/dashboard/account?${q}`, req.url));
        r.cookies.delete("oauth_state");
        r.cookies.delete("oauth_link");
        return r;
      };
      const current = await getCurrentUser();
      if (!current) {
        const r = NextResponse.redirect(new URL("/login", req.url));
        r.cookies.delete("oauth_state");
        r.cookies.delete("oauth_link");
        return r;
      }
      const me = await User.findById(current.userId);
      if (!me) return back("google=error&reason=missing");
      if (isStaffRole(me.role) || me.twoFactorEnabled) return back("google=error&reason=unavailable");
      const taken = await User.findOne({ googleId: googleUser.sub, _id: { $ne: me._id } }).select("_id").lean();
      if (taken) return back("google=error&reason=taken");

      me.googleId = googleUser.sub;
      me.googleSignInDisabled = false;
      if (googleUser.picture && !me.avatar) me.avatar = googleUser.picture;
      await me.save();
      return back("google=connected");
    }

    // The Google account id wins over the email, so a connected account whose Google email differs still signs in.
    let user =
      (googleUser.sub ? await User.findOne({ googleId: googleUser.sub }) : null) ||
      (await User.findOne({ email: googleUser.email.toLowerCase() }));

    if (user?.googleSignInDisabled) {
      const r = NextResponse.redirect(
        new URL(
          "/login?error=" +
            encodeURIComponent("Google sign-in was turned off for this account. Sign in with your email and password, then reconnect Google in Account settings."),
          req.url
        )
      );
      r.cookies.delete("oauth_state");
      return r;
    }

    if (!user) {
      const displayName = googleUser.name || "Client User";
      user = await User.create({
        name: displayName,
        email: googleUser.email.toLowerCase(),
        companyName: "",
        phone: "",
        address: "",
        role: "client",
        googleId: googleUser.sub,
        avatar: googleUser.picture,
        provider: "google",
        isVerified: true,
        isProfileComplete: false,
      });

      const newUser = user;
      after(() =>
        sendWelcomeEmail({ to: newUser.email, name: newUser.name }).catch((err) =>
          console.warn("[Email] Could not send welcome email:", err)
        )
      );
    } else {
      // Staff must sign in with email + password + 2FA, and users who turned on 2FA can't skip it through Google.
      if (isStaffRole(user.role) || user.twoFactorEnabled) {
        return NextResponse.redirect(
          new URL(
            "/login?error=" +
              encodeURIComponent(
                "This account must sign in with email, password and a two-factor code. Google sign-in is not available for it."
              ),
            req.url
          )
        );
      }
      // Update Google ID and avatar if needed
      if (!user.googleId) user.googleId = googleUser.sub;
      if (googleUser.picture && !user.avatar) user.avatar = googleUser.picture;

      // If key profile details are missing or have temporary defaults, mark incomplete
      const hasMissingDetails =
        !user.companyName ||
        !user.phone ||
        !user.address ||
        user.companyName.includes("'s Company") ||
        user.isProfileComplete === false;

      if (hasMissingDetails) {
        user.isProfileComplete = false;
      }
      await user.save();
    }

    const isProfileComplete = user.isProfileComplete !== false;

    // 4. Generate JWT Token
    const sessionId = await createUserSession(user._id.toString(), req);
    const signedInUser = user;
    after(() => recordLoginDevice(signedInUser, req));

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      companyName: user.companyName || "",
      role: user.role || "client",
      sessionId,
      tokenVersion: user.tokenVersion || 0,
      isProfileComplete,
    };

    const token = signToken(tokenPayload);

    // 5. Create redirect response and set cookie
    const targetPath = isProfileComplete ? "/dashboard" : "/complete-profile";
    const response = NextResponse.redirect(new URL(targetPath, req.url));

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    response.cookies.delete("oauth_state");
    response.cookies.delete("oauth_link");
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
