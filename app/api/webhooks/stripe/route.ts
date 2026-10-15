import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressPaymentEvent from "@/models/ExpressPaymentEvent";
import { handlePaymentEvent } from "@/lib/express/paymentService";
import { getPaymentProvider, PaymentError } from "@/lib/express/payments";

export const dynamic = "force-dynamic";

/**
 * Payment provider webhook. The signature is verified on the exact raw body
 * before anything is trusted. The success redirect alone never marks a booking
 * paid: only a verified checkout.session.completed does. The same event
 * arriving twice is a no-op.
 */
export async function POST(req: Request) {
  let provider;
  try {
    provider = getPaymentProvider();
  } catch (error) {
    console.error("[Express] Payments misconfigured:", error instanceof PaymentError ? error.message : error);
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }
  if (!provider) return NextResponse.json({ error: "Payments are not enabled" }, { status: 503 });

  const rawBody = await req.text();
  let event;
  try {
    event = provider.verifyWebhook(rawBody, req.headers.get("stripe-signature"));
  } catch (error) {
    console.warn("[Express] Rejected webhook:", error instanceof PaymentError ? error.detail || error.message : error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await connectDB();

    // Record the event. A repeat of one we already finished is acknowledged and ignored; one that
    // was received but never finished (a crash) is processed again.
    try {
      await ExpressPaymentEvent.create({ eventId: event.id, type: event.rawType, shipmentId: event.shipmentId });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      const seen = await ExpressPaymentEvent.findOne({ eventId: event.id }).lean();
      if (seen?.processedAt) return NextResponse.json({ received: true, duplicate: true });
    }

    const outcome = await handlePaymentEvent(event, provider);
    await ExpressPaymentEvent.updateOne({ eventId: event.id }, { $set: { processedAt: new Date(), outcome } });
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    // 500 makes the provider redeliver, which is safe because every step is idempotent.
    console.error("[Express] Webhook processing failed for", event.id, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
