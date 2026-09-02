import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Carrier from "@/models/Carrier";
import {
  getStoredCarriers,
  addCarrierToStore,
  CarrierVendor,
  TransportModeType,
} from "@/lib/mockData";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") as TransportModeType | null;
    const search = searchParams.get("q")?.toLowerCase() || "";

    let carriers: CarrierVendor[] = getStoredCarriers();

    // Try fetching from MongoDB if available
    try {
      await connectDB();
      const dbCarriers = await Carrier.find().lean();
      if (dbCarriers && dbCarriers.length > 0) {
        // Merge MongoDB carriers with initial mock carriers
        const dbMapped: CarrierVendor[] = dbCarriers.map((c: any) => ({
          id: c._id.toString(),
          name: c.name,
          code: c.code,
          primaryMode: c.primaryMode,
          supportedModes: c.supportedModes || [c.primaryMode],
          dispatchContact: {
            name: c.dispatchContact?.name || "Dispatch Desk",
            phone: c.dispatchContact?.phone || "+1 (800) 555-0100",
            email: c.dispatchContact?.email || "dispatch@carrier.ca",
            emergencyPhone: c.dispatchContact?.emergency247Phone,
          },
          headquarters: c.headquarters || "Canada",
          operatingLanes: c.operatingLanes || [],
          fleetSize: c.fleetSize || "50+ Dedicated Units",
          rating: c.rating || 4.8,
          totalShipmentsCompleted: c.totalShipmentsCompleted || 0,
          onTimeDeliveryRate: c.onTimeDeliveryRate || "98.0%",
          insurance: {
            policyNumber: c.insurance?.policyNumber || "POL-STANDARD",
            coverageAmount: c.insurance?.coverageAmount || "$5,000,000 CAD",
            expiryDate: c.insurance?.expiryDate || "2027-12-31",
            isCompliant: c.insurance?.isCompliant !== false,
          },
          status: c.status || "Active",
          notes: c.notes || "",
        }));

        // Combine uniquely by code
        for (const dc of dbMapped) {
          if (!carriers.find((c) => c.code.toUpperCase() === dc.code.toUpperCase())) {
            carriers.unshift(dc);
          }
        }
      }
    } catch (dbErr) {
      console.warn("[Admin Carriers API] DB fetch fallback:", dbErr);
    }

    // Filter by mode
    let filtered = carriers;
    if (mode && mode !== ("all" as any)) {
      filtered = filtered.filter(
        (c) =>
          c.primaryMode.toLowerCase() === mode.toLowerCase() ||
          c.supportedModes?.some((m) => m.toLowerCase() === mode.toLowerCase())
      );
    }

    // Filter by search
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.code.toLowerCase().includes(search) ||
          c.dispatchContact.name.toLowerCase().includes(search) ||
          c.operatingLanes.some((l) => l.toLowerCase().includes(search))
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

    if (!name || !code || !primaryMode || !dispatchContact?.phone || !dispatchContact?.email) {
      return NextResponse.json(
        { error: "Carrier name, code, transport mode, and dispatch contact details are required" },
        { status: 400 }
      );
    }

    const carrierId = `CAR-${Math.floor(100 + Math.random() * 900)}`;

    const newCarrier: CarrierVendor = {
      id: carrierId,
      name,
      code: code.toUpperCase(),
      primaryMode: primaryMode || "Road",
      supportedModes: supportedModes || [primaryMode],
      dispatchContact: {
        name: dispatchContact.name || "Primary Dispatch",
        phone: dispatchContact.phone,
        email: dispatchContact.email,
        emergencyPhone: dispatchContact.emergencyPhone,
      },
      headquarters: headquarters || "Canada",
      operatingLanes: operatingLanes || [],
      fleetSize: fleetSize || "Dedicated Units",
      rating: parseFloat(rating) || 4.8,
      totalShipmentsCompleted: 0,
      onTimeDeliveryRate: "100.0%",
      insurance: {
        policyNumber: insurance?.policyNumber || `POL-${code.toUpperCase()}-2026`,
        coverageAmount: insurance?.coverageAmount || "$5,000,000 CAD",
        expiryDate: insurance?.expiryDate || "2027-12-31",
        isCompliant: true,
      },
      status: "Active",
      notes: notes || "",
    };

    // Save in DB if available
    try {
      await connectDB();
      await Carrier.create({
        ...newCarrier,
        dispatchContact: {
          ...newCarrier.dispatchContact,
          emergency247Phone: newCarrier.dispatchContact.emergencyPhone,
        },
      });
    } catch (dbErr) {
      console.warn("[Admin Carriers API] DB create fallback:", dbErr);
    }

    addCarrierToStore(newCarrier);

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
