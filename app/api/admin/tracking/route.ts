import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import TrackedContainer from "@/models/TrackedContainer";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { getAllRateLimitUsage } from "@/lib/tracking/rateLimiter";
import { getCarrierConfig } from "@/lib/tracking/config";
import { CARRIER_CODES } from "@/lib/tracking/schema";

/** GET — admin overview: every tracked container (cache only) plus each carrier's mock/live mode and rate-limiter usage. */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = verifyToken(token);
  if (!actor) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  await connectDB();
  const actorUser = await User.findById(actor.userId).lean<any>();
  if (!actorUser || !hasModulePermission(actorUser, "shipments")) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to view container tracking." },
      { status: 403 }
    );
  }

  const containers = await TrackedContainer.find({})
    .select("-raw")
    .sort({ updatedAt: -1 })
    .lean<any[]>();

  const carriers = CARRIER_CODES.map((carrier) => ({
    carrier,
    mockMode: getCarrierConfig(carrier).useMock,
    rateLimit: getAllRateLimitUsage().find((u) => u.carrier === carrier),
  }));

  return NextResponse.json({
    success: true,
    carriers,
    containers: containers.map((c) => ({
      containerNumber: c.containerNumber,
      carrier: c.carrier,
      carrierDetectionSource: c.carrierDetectionSource,
      status: c.status,
      shipmentId: c.shipmentId || null,
      vesselName: c.vesselName,
      voyageNumber: c.voyageNumber,
      lastSyncedAt: c.lastSyncedAt,
    })),
  });
}
