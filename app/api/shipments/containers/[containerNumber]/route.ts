import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { getCurrentUser } from "@/lib/session";
import { getContainerTracking } from "@/lib/tracking/sync";

/**
 * Client-facing milestone timeline read. Reads the cache only (requirement
 * 6) — never calls an adapter directly — and only for a container that's
 * linked to a shipment the signed-in user actually owns.
 */
export async function GET(req: Request, { params }: { params: Promise<{ containerNumber: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { containerNumber } = await params;
  const number = decodeURIComponent(containerNumber).trim().toUpperCase();

  try {
    await connectDB();
    const shipment = await Shipment.findOne({
      "containers.containerNumber": number,
      $or: [{ "client.userId": currentUser.userId }, { "client.email": currentUser.email }],
    }).lean<any>();

    if (!shipment) {
      return NextResponse.json(
        { error: `No container "${number}" found on your account.` },
        { status: 404 }
      );
    }

    const tracking = await getContainerTracking(number);

    return NextResponse.json({
      success: true,
      shipment: { trackingNumber: shipment.trackingNumber },
      tracking,
    });
  } catch (error: any) {
    console.error("Error fetching container tracking:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch container tracking" },
      { status: 500 }
    );
  }
}
