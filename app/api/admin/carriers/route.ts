import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Carrier, { TransportMode } from "@/models/Carrier";
import User from "@/models/User";
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

export async function GET(req: Request) {
  try {
    const access = await requireCarrierAccess();
    if (access.error) return access.error;

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") as TransportMode | null;
    const search = searchParams.get("q")?.toLowerCase() || "";

    await connectDB();
    const dbCarriers = await Carrier.find().sort({ createdAt: -1 }).lean();

    const carriers = dbCarriers.map(mapCarrier);

    // Filter by mode
    let filtered = carriers;
    if (mode && mode !== ("all" as any)) {
      filtered = filtered.filter(
        (c) =>
          c.primaryMode.toLowerCase() === mode.toLowerCase() ||
          c.supportedModes?.some((m: string) => m.toLowerCase() === mode.toLowerCase())
      );
    }

    // Filter by search
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.code.toLowerCase().includes(search) ||
          c.dispatchContact.name.toLowerCase().includes(search) ||
          c.operatingLanes.some((l: string) => l.toLowerCase().includes(search))
      );
    }

    const modeCounts = {
      all: carriers.length,
      road: carriers.filter((c) => c.primaryMode === "Road").length,
      sea: carriers.filter((c) => c.primaryMode === "Sea").length,
      air: carriers.filter((c) => c.primaryMode === "Air").length,
      rail: carriers.filter((c) => c.primaryMode === "Rail").length,
    };

    return NextResponse.json({
      success: true,
      carriers: filtered,
      counts: modeCounts,
    });
  } catch (error: any) {
    console.error("Error fetching carriers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch carriers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireCarrierAccess();
    if (access.error) return access.error;

    const body = await req.json();
    const {
      name,
      code,
      primaryMode,
      supportedModes,
      dispatchContact,
      headquarters,
      operatingLanes,
      fleetSize,
      units,
      rating,
      insurance,
      notes,
    } = body;

    if (
      !name ||
      !code ||
      !primaryMode ||
      !dispatchContact?.phone ||
      !dispatchContact?.email ||
      !headquarters ||
      !insurance?.expiryDate
    ) {
      return NextResponse.json(
        {
          error:
            "Carrier name, code, transport mode, headquarters, dispatch contact, and insurance expiry are required",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await Carrier.findOne({ code: code.toUpperCase() });
    if (existing) {
      return NextResponse.json(
        { error: `A carrier with code ${code.toUpperCase()} already exists` },
        { status: 409 }
      );
    }

    const newCarrier = await Carrier.create({
      name,
      code: code.toUpperCase(),
      primaryMode,
      supportedModes: supportedModes || [primaryMode],
      dispatchContact: {
        name: dispatchContact.name || "",
        phone: dispatchContact.phone,
        email: dispatchContact.email,
        emergency247Phone: dispatchContact.emergencyPhone || "",
      },
      headquarters,
      operatingLanes: operatingLanes || [],
      fleetSize: fleetSize || "",
      units: Array.isArray(units)
        ? units
            .filter((u: any) => u.driverName && u.vehicleType && u.plateNumber)
            .map((u: any) => ({
              driverName: u.driverName,
              vehicleType: u.vehicleType,
              plateNumber: u.plateNumber,
              active: u.active !== false,
            }))
        : [],
      // A brand-new partner has no completed loads yet, so it has no earned
      // reliability rating either — default to 0 ("Not Yet Rated"), never a
      // fabricated starting score.
      rating: rating ? parseFloat(rating) : 0,
      totalShipmentsCompleted: 0,
      onTimeDeliveryRate: "0.0%",
      insurance: {
        policyNumber: insurance?.policyNumber || `POL-${code.toUpperCase()}-${new Date().getFullYear()}`,
        coverageAmount: insurance?.coverageAmount || "",
        expiryDate: insurance.expiryDate,
        isCompliant: new Date(insurance.expiryDate).getTime() > Date.now(),
      },
      status: "Active",
      notes: notes || "",
    });

    return NextResponse.json({
      success: true,
      message: `Carrier ${name} (${code}) successfully registered`,
      carrier: mapCarrier(newCarrier.toObject()),
    });
  } catch (error: any) {
    console.error("Error creating carrier:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create carrier" },
      { status: 500 }
    );
  }
}
