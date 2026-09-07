import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Session from "@/models/Session";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectDB();

    const session = await Session.findOne({ _id: id, userId: currentUser.userId });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const isCurrentDevice = session.sessionId === currentUser.sessionId;
    await Session.deleteOne({ _id: id });

    const response = NextResponse.json({
      success: true,
      message: "Device logged out",
      isCurrentDevice,
    });

    // Only clear the browser's own cookie when it just logged itself out —
    // revoking another device must not touch this browser's session.
    if (isCurrentDevice) {
      response.cookies.set("token", "", {
        httpOnly: true,
        expires: new Date(0),
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("Error revoking session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log out device" },
      { status: 500 }
    );
  }
}
