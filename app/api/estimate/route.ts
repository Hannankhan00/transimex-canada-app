import { NextRequest, NextResponse } from "next/server";
import { calculateFreightEstimate, EstimateRequest } from "@/lib/pricing/estimator";

export async function POST(req: NextRequest) {
  try {
    const body: EstimateRequest = await req.json();

    if (!body.origin || !body.destination || !body.mode) {
      return NextResponse.json(
        {
          error: "Missing required fields: origin, destination, and mode are required.",
        },
        { status: 400 }
      );
    }

    const result = calculateFreightEstimate(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Could not calculate freight estimate.",
          details: result,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[API Error] /api/estimate failed:", error);
    return NextResponse.json(
      { error: "Internal server error calculating shipping estimate." },
      { status: 500 }
    );
  }
}
