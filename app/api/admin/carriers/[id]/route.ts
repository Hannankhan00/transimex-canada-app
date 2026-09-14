import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Carrier from "@/models/Carrier";
import User from "@/models/User";
import Shipment from "@/models/Shipment";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { mapCarrier } from "@/lib/carrierSerialize";

async function requireCarrierAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const actor = verifyToken(token);
  if (!actor) {
    return { error: NextResponse.json({ error: "Invalid session token" }, { status: 401 }) };
  }

  await connectDB();
  const actorUser = await User.findById(actor.userId).lean<any>();
  if (!actorUser || !hasModulePermission(actorUser, "carriers")) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: You do not have permission to access the carrier network." },
        { status: 403 }
      ),
    };
  }

  return { actorUser };
}

function findCarrierQuery(id: string) {
  return {
    $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { code: id.toUpperCase() }],
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireCarrierAccess();
    if (access.error) return access.error;

    const { id } = await params;
    await connectDB();
    const dbCarrier = await Carrier.findOne(findCarrierQuery(id)).lean<any>();

    if (!dbCarrier) {
      return NextResponse.json({ error: "Carrier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, carrier: mapCarrier(dbCarrier) });
  } catch (error: any) {
    console.error("Error fetching carrier:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch carrier" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireCarrierAccess();
    if (access.error) return access.error;

    const { id } = await params;
    const body = await req.json();

    await connectDB();
    const dbCarrier = await Carrier.findOne(findCarrierQuery(id));

    if (!dbCarrier) {
      return NextResponse.json({ error: "Carrier not found" }, { status: 404 });
    }

    if (body.name) dbCarrier.name = body.name;
    if (body.primaryMode) dbCarrier.primaryMode = body.primaryMode;
    if (body.headquarters) dbCarrier.headquarters = body.headquarters;
    if (body.fleetSize) dbCarrier.fleetSize = body.fleetSize;
    if (Array.isArray(body.units)) {
      const keptIds = new Set(
        body.units.map((u: any) => u.id).filter((id: any) => id && /^[0-9a-fA-F]{24}$/.test(id))
      );
      const removedIds = (dbCarrier.units || [])
        .map((u: any) => u._id.toString())
        .filter((id: string) => !keptIds.has(id));

      if (removedIds.length > 0) {
        const activeUsage = await Shipment.countDocuments({
          unitId: { $in: removedIds },
          status: { $nin: ["Delivered", "Cancelled"] },
        });
        if (activeUsage > 0) {
          return NextResponse.json(
            {
              error:
                "Cannot remove a unit that is currently assigned to an active shipment. Reassign that shipment first.",
            },
            { status: 409 }
          );
        }
      }

      dbCarrier.units = body.units
        .filter((u: any) => u.driverName && u.vehicleType && u.plateNumber)
        .map((u: any) => ({
          _id: u.id && /^[0-9a-fA-F]{24}$/.test(u.id) ? u.id : undefined,
          driverName: u.driverName,
          vehicleType: u.vehicleType,
          plateNumber: u.plateNumber,
          active: u.active !== false,
        })) as any;
    }
    if (body.rating !== undefined) dbCarrier.rating = body.rating;
    if (body.status) dbCarrier.status = body.status;
    if (body.notes !== undefined) dbCarrier.notes = body.notes;
    if (body.operatingLanes) dbCarrier.operatingLanes = body.operatingLanes;

    if (body.dispatchContact) {
      dbCarrier.dispatchContact = {
        ...dbCarrier.dispatchContact,
        ...body.dispatchContact,
      };
    }

    if (body.insurance) {
      dbCarrier.insurance = {
        ...dbCarrier.insurance,
        ...body.insurance,
      };
    }

    await dbCarrier.save();

    return NextResponse.json({
      success: true,
      message: `Carrier ${dbCarrier.name} updated successfully`,
      carrier: mapCarrier(dbCarrier.toObject()),
    });
  } catch (error: any) {
    console.error("Error updating carrier:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update carrier" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireCarrierAccess();
    if (access.error) return access.error;

    const { id } = await params;
    await connectDB();
    const dbCarrier = await Carrier.findOne(findCarrierQuery(id));

    if (!dbCarrier) {
      return NextResponse.json({ error: "Carrier not found" }, { status: 404 });
    }

    const inUseCount = await Shipment.countDocuments({
      carrierId: dbCarrier._id.toString(),
      status: { $nin: ["Delivered", "Cancelled"] },
    });
    if (inUseCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: this carrier is currently assigned to ${inUseCount} active shipment(s). Reassign those shipments first.`,
        },
        { status: 409 }
      );
    }

    await dbCarrier.deleteOne();

    return NextResponse.json({
      success: true,
      message: `Carrier ${dbCarrier.name} removed from the directory`,
    });
  } catch (error: any) {
    console.error("Error deleting carrier:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete carrier" },
      { status: 500 }
    );
  }
}
