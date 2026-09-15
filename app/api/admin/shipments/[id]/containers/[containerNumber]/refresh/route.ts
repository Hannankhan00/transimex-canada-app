import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { syncContainer } from "@/lib/tracking/sync";
import { CarrierCode } from "@/lib/tracking/schema";

/** POST — forces an immediate re-sync for one container (manual "Refresh" action in the admin UI). Still goes through the adapter's rate limiter in live mode. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; containerNumber: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = verifyToken(token);
  if (!actor) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  await connectDB();
  const actorUser = await User.findById(actor.userId).lean<any>();
  if (!actorUser || !hasModulePermission(actorUser, "shipments")) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to manage shipment containers." },
      { status: 403 }
    );
  }

  const { id, containerNumber } = await params;
  const number = decodeURIComponent(containerNumber).toUpperCase();

  const shipment = await Shipment.findOne({
    $or: [{ trackingNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  }).lean<any>();
  if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

  const onShipment = (shipment.containers || []).find((c: any) => c.containerNumber === number);
  if (!onShipment) return NextResponse.json({ error: `Container ${number} is not on this shipment.` }, { status: 404 });

  try {
    const tracking = await syncContainer(number, (onShipment.carrier as CarrierCode) || null);
    return NextResponse.json({ success: true, tracking });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to refresh tracking" }, { status: 502 });
  }
}
