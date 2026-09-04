import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const number = searchParams.get("number")?.trim();

  if (!number) {
    return NextResponse.json({ error: "Tracking number is required" }, { status: 400 });
  }

  try {
    await connectDB();
    const shipment = await Shipment.findOne({
      trackingNumber: new RegExp(`^${number}$`, "i"),
      $or: [{ "client.userId": currentUser.userId }, { "client.email": currentUser.email }],
    }).lean<any>();

    if (!shipment) {
      return NextResponse.json(
        { error: `No shipment found on your account matching "${number}".` },
        { status: 404 }
      );
    }

    const lastEvent = shipment.timeline?.[shipment.timeline.length - 1];

    return NextResponse.json({
      success: true,
      shipment: {
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        origin: shipment.route?.origin,
        destination: shipment.route?.destination,
        eta: shipment.eta,
        lastEvent: lastEvent
          ? { title: lastEvent.title, location: lastEvent.location, statusText: lastEvent.statusText }
          : null,
      },
    });
  } catch (error: any) {
    console.error("Error tracking shipment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to track shipment" },
      { status: 500 }
    );
  }
}
