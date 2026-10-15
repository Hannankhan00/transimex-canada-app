import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireExpressClient } from "@/lib/express/access";
import { startCheckout } from "@/lib/express/paymentService";
import { getPaymentProvider, PaymentError } from "@/lib/express/payments";

type Ctx = { params: Promise<{ id: string }> };

/** Starts card payment for the caller's own unpaid booking and returns the hosted payment page URL. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    let provider;
    try {
      provider = getPaymentProvider();
    } catch (error) {
      console.error("[Express] Payments misconfigured:", error instanceof PaymentError ? error.message : error);
      provider = null;
    }
    if (!provider) {
      return NextResponse.json({ error: "Online payment is not available yet. Please try again later.", code: "payments_unavailable" }, { status: 503 });
    }

    const result = await startCheckout({
      shipmentId: id,
      userId: access.actor.userId,
      customerEmail: access.actor.email,
      baseUrl: (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, ""),
      provider,
    });
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });

    return NextResponse.json({ success: true, url: result.url, reused: result.reused });
  } catch (error) {
    console.error("Express checkout error:", error);
    return NextResponse.json({ error: "Failed to start payment" }, { status: 500 });
  }
}
