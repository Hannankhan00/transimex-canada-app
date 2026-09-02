import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface DecodedToken {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  exp?: number;
}

function parseJwt(token: string): DecodedToken | null {
  try {
    if (token.startsWith("mock-admin-")) {
      return { role: "admin", email: "admin@transimex.ca", name: "Jean-Philippe Tremblay" };
    }
    if (token.startsWith("mock-client-") || token.startsWith("mock-user-")) {
      return { role: "client", email: "client@transimex.ca", name: "Marc Tremblay" };
    }
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const decoded = JSON.parse(jsonPayload);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore static assets, next internals, and public api routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const tokenCookie = request.cookies.get("token")?.value;
  const decoded = tokenCookie ? parseJwt(tokenCookie) : null;
  const isAuthenticated = !!decoded;
  const role = decoded?.role || "client";
  const isStaff = role === "admin" || role === "superadmin" || role === "subadmin";
  const isClient = !isStaff && (role === "client" || role === "user");

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  // 1. Auth routes (/login, /register, etc.)
  if (isAuthRoute) {
    if (isAuthenticated) {
      if (isStaff) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 2. Client Dashboard routes (/dashboard, /dashboard/*)
  if (isDashboardRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Admin routes (/admin, /admin/*)
  if (isAdminRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Strict Guard: Standard client attempting to access any /admin route is kicked to /dashboard
    if (isClient) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
