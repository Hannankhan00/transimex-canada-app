import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Carrier, { TransportMode } from "@/models/Carrier";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") as TransportMode | null;
    const search = searchParams.get("q")?.toLowerCase() || "";

    await connectDB();
    const dbCarriers = await Carrier.find().sort({ createdAt: -1 }).lean();

    let carriers = dbCarriers.map((c: any) => ({
      id: c._id.toString(),
      name: c.name,
      code: c.code,
      primaryMode: c.primaryMode,
      supportedModes: c.supportedModes || [c.primaryMode],
      dispatchContact: {
        name: c.dispatchContact?.name || "",
        phone: c.dispatchContact?.phone || "",
        email: c.dispatchContact?.email || "",
        emergencyPhone: c.dispatchContact?.emergency247Phone,
      },
      headquarters: c.headquarters || "",
      operatingLanes: c.operatingLanes || [],
      fleetSize: c.fleetSize || "",
      rating: c.rating ?? 0,
      totalShipmentsCompleted: c.totalShipmentsCompleted || 0,
      onTimeDeliveryRate: c.onTimeDeliveryRate || "",
      insurance: {
        policyNumber: c.insurance?.policyNumber || "",
        coverageAmount: c.insurance?.coverageAmount || "",
        expiryDate: c.insurance?.expiryDate || "",
        isCompliant: c.insurance?.isCompliant !== false,
      },
      status: c.status || "Active",
      notes: c.notes || "",
    }));

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
      rating: rating ? parseFloat(rating) : 4.8,
      totalShipmentsCompleted: 0,
      onTimeDeliveryRate: "0.0%",
      insurance: {
        policyNumber: insurance?.policyNumber || `POL-${code.toUpperCase()}-${new Date().getFullYear()}`,
        coverageAmount: insurance?.coverageAmount || "",
        expiryDate: insurance.expiryDate,
        isCompliant: true,
      },
      status: "Active",
      notes: notes || "",
    });

    return NextResponse.json({
      success: true,
      message: `Carrier ${name} (${code}) successfully registered`,
      carrier: newCarrier,
    });
  } catch (error: any) {
    console.error("Error creating carrier:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create carrier" },
      { status: 500 }
    );
  }
}
