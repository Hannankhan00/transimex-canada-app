import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

async function authorize() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const actor = verifyToken(token);
  if (!actor) return { error: NextResponse.json({ error: "Invalid session token" }, { status: 401 }) };

  await connectDB();
  const actorUser = await User.findById(actor.userId).lean<any>();
  if (!actorUser || !hasModulePermission(actorUser, "shipments")) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: You do not have permission to manage shipment containers." },
        { status: 403 }
      ),
    };
  }
  return { actor };
}

/** DELETE — unlinks a container from the shipment (the cached TrackedContainer record is left in place for history/debugging). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; containerNumber: string }> }
) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const { actor } = auth;

  const { id, containerNumber } = await params;
  const number = decodeURIComponent(containerNumber).toUpperCase();

  const shipment = await Shipment.findOne({
    $or: [{ trackingNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  });
  if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

  const before = shipment.containers?.length || 0;
  shipment.containers = (shipment.containers || []).filter((c: any) => c.containerNumber !== number);
  if (shipment.containers.length === before) {
    return NextResponse.json({ error: `Container ${number} is not on this shipment.` }, { status: 404 });
  }
  await shipment.save();

  await logAudit({
    actor: actor!,
    action: "CONTAINER_UNLINKED",
    resourceType: "Shipment",
    resourceId: shipment.trackingNumber,
    details: `Unlinked container ${number} from shipment ${shipment.trackingNumber}.`,
  });

  return NextResponse.json({ success: true });
}
