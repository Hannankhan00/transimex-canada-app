import { NextResponse } from "next/server";
import { getWebhookSecret } from "@/lib/tracking/config";
import { applyWebhookUpdate } from "@/lib/tracking/sync";
import { CarrierCode } from "@/lib/tracking/schema";
import { InvalidPayloadError } from "@/lib/tracking/adapters/types";

const URL_SEGMENT_TO_CARRIER: Record<string, CarrierCode> = {
  maersk: "MAERSK",
  msc: "MSC",
  // CMA CGM has no webhook channel per DOCs/container tracking.docx §5.4 — polling only.
};

/**
 * Webhook receiver stub (requirement 5). Maersk and MSC both support push
 * notifications — point each carrier's webhook config at
 * `/api/webhooks/tracking/maersk` or `/api/webhooks/tracking/msc` once
 * credentials are live. The shared-secret header check below is a
 * placeholder: confirm each carrier's actual signature/verification scheme
 * from their webhook docs during onboarding and replace it (see INTEGRATION.md).
 */
export async function POST(req: Request, { params }: { params: Promise<{ carrier: string }> }) {
  const { carrier: carrierSegment } = await params;
  const carrier = URL_SEGMENT_TO_CARRIER[carrierSegment.toLowerCase()];
  if (!carrier) {
    return NextResponse.json({ error: `No webhook channel for "${carrierSegment}".` }, { status: 404 });
  }

  const expectedSecret = getWebhookSecret(carrier);
  if (expectedSecret) {
    const provided = req.headers.get("x-webhook-secret") || "";
    if (provided !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const tracking = await applyWebhookUpdate(carrier, payload);
    return NextResponse.json({ success: true, containerNumber: tracking.containerNumber });
  } catch (error: any) {
    if (error instanceof InvalidPayloadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(`Error applying ${carrier} webhook payload:`, error);
    return NextResponse.json({ error: error.message || "Failed to apply webhook payload" }, { status: 500 });
  }
}
