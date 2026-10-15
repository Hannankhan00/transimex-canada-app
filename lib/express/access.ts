import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { TokenPayload, verifyToken } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { hasModulePermission, isStaffRole } from "@/lib/rbac";
import { isExpressEnabled } from "@/lib/express/config";

type Denied = { error: NextResponse; actor?: undefined };

/**
 * Staff access to Express admin routes. Same checks the other admin routes use
 * (token, then a live permission lookup), for the "express" module. Admin
 * routes are not gated by EXPRESS_ENABLED so staff can configure before launch.
 */
export async function requireExpressStaff(): Promise<Denied | { error?: undefined; actor: TokenPayload }> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const actor = verifyToken(token);
  if (!actor) return { error: NextResponse.json({ error: "Invalid session token" }, { status: 401 }) };

  await connectDB();
  const user = await User.findById(actor.userId).lean<any>();
  if (!user || !hasModulePermission(user, "express")) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: You do not have permission to manage Transimex Express." },
        { status: 403 }
      ),
    };
  }
  return { actor };
}

/**
 * A signed-in client using the Express area. Returns 404 while the feature
 * flag is off, 401 when signed out and 403 for staff accounts.
 */
export async function requireExpressClient(): Promise<Denied | { error?: undefined; actor: TokenPayload }> {
  if (!isExpressEnabled()) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  const actor = await getCurrentUser();
  if (!actor) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (isStaffRole(actor.role)) {
    return { error: NextResponse.json({ error: "Staff accounts cannot use client Express." }, { status: 403 }) };
  }
  return { actor };
}

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      fields: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    },
    { status: 422 }
  );
}
