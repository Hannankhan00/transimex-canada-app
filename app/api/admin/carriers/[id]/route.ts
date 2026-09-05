import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Carrier from "@/models/Carrier";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    await connectDB();
    const dbCarrier = await Carrier.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { code: id.toUpperCase() }],
    });

    if (!dbCarrier) {
      return NextResponse.json({ error: "Carrier not found" }, { status: 404 });
    }

    if (body.name) dbCarrier.name = body.name;
    if (body.primaryMode) dbCarrier.primaryMode = body.primaryMode;
    if (body.headquarters) dbCarrier.headquarters = body.headquarters;
    if (body.fleetSize) dbCarrier.fleetSize = body.fleetSize;
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
      carrier: dbCarrier,
    });
  } catch (error: any) {
    console.error("Error updating carrier:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update carrier" },
      { status: 500 }
    );
  }
}
