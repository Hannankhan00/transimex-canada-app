import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import ExpressInvoice from "@/models/ExpressInvoice";
import { requireExpressClient } from "@/lib/express/access";
import { getPaymentsMode } from "@/lib/express/payments/config";
import { buildMockWebhook } from "@/lib/express/payments/mock";

type Ctx = { params: Promise<{ sessionId: string }> };

/** TEST MODE ONLY: these routes do not exist unless PAYMENTS_MODE=mock (and never in production). */
function mockEnabled(): boolean {
  try {
    return getPaymentsMode() === "mock";
  } catch {
    return false;
  }
}

/** The payment session belongs to one of the caller's bookings or invoices. */
async function findOwnSession(sessionId: string, userId: string) {
  await connectDB();
  const sh = await ExpressShipment.findOne({ "payment.sessionId": sessionId, userId }).lean();
  if (sh) {
    return { kind: "shipment" as const, id: String(sh._id), reference: sh.reference, amountCents: sh.totalCents, payable: sh.status === "awaiting_payment", back: `/express/shipments/${sh._id}` };
  }
  const inv = await ExpressInvoice.findOne({ "payment.sessionId": sessionId, userId }).lean();
  if (inv) {
    return { kind: "invoice" as const, id: String(inv._id), reference: inv.number, amountCents: inv.totalCents, payable: inv.status === "issued", back: `/express/invoices/${inv._id}` };
  }
  return null;
}

export async function GET(_req: Request, { params }: Ctx) {
  if (!mockEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await requireExpressClient();
  if (access.error) return access.error;

  const { sessionId } = await params;
  const found = await findOwnSession(sessionId, access.actor.userId);
  if (!found) return NextResponse.json({ error: "Payment session not found" }, { status: 404 });
  return NextResponse.json({ success: true, kind: found.kind, reference: found.reference, amountCents: found.amountCents, payable: found.payable });
}

const bodySchema = z.object({
  outcome: z.enum(["pay", "fail", "cancel", "expire"]),
  /** Deliver the same event twice, like a provider retry. */
  duplicate: z.boolean().optional(),
});

/** Simulates what the hosted payment page does, by sending a signed webhook to the real webhook route. */
export async function POST(req: Request, { params }: Ctx) {
  if (!mockEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await requireExpressClient();
  if (access.error) return access.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });

  const { sessionId } = await params;
  const found = await findOwnSession(sessionId, access.actor.userId);
  if (!found) return NextResponse.json({ error: "Payment session not found" }, { status: 404 });

  const back = found.back;
  const { outcome, duplicate } = parsed.data;

  if (outcome === "cancel") return NextResponse.json({ success: true, redirect: `${back}?cancelled=1` });
  if (outcome === "fail") return NextResponse.json({ success: false, message: "Your card was declined. Try another card." });

  const { payload, header } = buildMockWebhook({
    eventId: `evt_mock_${randomUUID()}`,
    type: outcome === "pay" ? "checkout.session.completed" : "checkout.session.expired",
    sessionId,
    ...(found.kind === "invoice" ? { invoiceId: found.id } : { shipmentId: found.id }),
    reference: found.reference,
    amountCents: found.amountCents,
    paid: outcome === "pay",
  });

  const url = new URL("/api/webhooks/stripe", req.url).toString();
  const deliveries = duplicate ? 2 : 1;
  let status = 0;
  for (let i = 0; i < deliveries; i++) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": header }, body: payload });
    status = res.status;
  }
  if (status >= 400) return NextResponse.json({ success: false, message: "The payment could not be recorded." }, { status: 502 });
  return NextResponse.json({ success: true, redirect: outcome === "pay" ? `${back}?paid=1` : `${back}?cancelled=1` });
}
