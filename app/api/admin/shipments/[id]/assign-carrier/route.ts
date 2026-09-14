import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import Carrier from "@/models/Carrier";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { isCarrierAssignable } from "@/lib/carrierTypes";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actor = verifyToken(token);
    if (!actor) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
    }

    await connectDB();
    const actorUser = await User.findById(actor.userId).lean<any>();
    if (!actorUser || !hasModulePermission(actorUser, "shipments")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to dispatch shipments." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { carrierId, unitId } = body || {};

    if (!carrierId || !unitId) {
      return NextResponse.json({ error: "carrierId and unitId are required" }, { status: 400 });
    }

    const carrier = await Carrier.findById(carrierId).lean<any>();
    if (!carrier) {
      return NextResponse.json({ error: "Saved carrier not found" }, { status: 404 });
    }

    if (!isCarrierAssignable(carrier)) {
      return NextResponse.json(
        {
          error: `Cannot assign ${carrier.name}: carrier status is "${carrier.status}" or its insurance has expired. Update the carrier's compliance record before dispatching a load to it.`,
        },
        { status: 409 }
      );
    }

    const unit = (carrier.units || []).find((u: any) => u._id.toString() === unitId);
    if (!unit) {
      return NextResponse.json({ error: "Selected vehicle/driver unit not found on this carrier" }, { status: 404 });
    }
    if (unit.active === false) {
      return NextResponse.json({ error: "This unit is marked inactive and cannot be assigned" }, { status: 409 });
    }

    const shipment = await Shipment.findOne({
      $or: [{ trackingNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // Only carrier company name, driver name, vehicle type, and plate number
    // are copied onto the shipment — phone/email stay on the Carrier record
    // so they never reach client-facing shipment APIs.
    shipment.carrierId = carrier._id.toString();
    shipment.unitId = unit._id.toString();
    shipment.assignedCarrier = carrier.name;
    shipment.driverName = unit.driverName;
    shipment.vehicleType = unit.vehicleType;
    shipment.plateNumber = unit.plateNumber;

    await shipment.save();

    await logAudit({
      actor,
      action: "CARRIER_ASSIGNED",
      resourceType: "Shipment",
      resourceId: shipment.trackingNumber,
      details: `Assigned carrier ${carrier.name} (${carrier.code}) — driver ${unit.driverName}, ${unit.vehicleType} (${unit.plateNumber}) — to shipment ${shipment.trackingNumber}.`,
    });

    return NextResponse.json({
      success: true,
      message: `${carrier.name} — ${unit.driverName} assigned to shipment ${shipment.trackingNumber}`,
      shipment: {
        id: shipment.trackingNumber,
        carrierId: shipment.carrierId,
        unitId: shipment.unitId,
        carrier: shipment.assignedCarrier,
        driver: shipment.driverName,
        vehicleType: shipment.vehicleType,
        plateNumber: shipment.plateNumber,
      },
    });
  } catch (error: any) {
    console.error("Error assigning carrier to shipment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign carrier" },
      { status: 500 }
    );
  }
}
