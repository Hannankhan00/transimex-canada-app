import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";

const DEFAULT_PREFERENCES = {
  emailShipmentUpdates: true,
  emailCustomsHolds: true,
  emailNewDocuments: true,
  emailRateAlerts: false,
  smsUrgentAlerts: true,
};

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const user = await User.findById(currentUser.userId).lean<any>();
    return NextResponse.json({
      success: true,
      preferences: user?.emailPreferences || DEFAULT_PREFERENCES,
    });
  } catch (error: any) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    await connectDB();
    const user = await User.findById(currentUser.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const current = user.emailPreferences || DEFAULT_PREFERENCES;
    user.emailPreferences = { ...current, ...body } as any;
    await user.save();

    return NextResponse.json({ success: true, preferences: user.emailPreferences });
  } catch (error: any) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update preferences" },
      { status: 500 }
    );
  }
}
