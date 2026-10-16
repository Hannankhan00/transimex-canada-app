import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mongoose", () => ({ default: async () => undefined }));

import { decideInvoiceBooking } from "../credit";
import { addDays, buildInvoiceLines, isOverdue, netBillable } from "../invoicing";
import { displayStatus, toAdminInvoiceDTO, toClientInvoiceDTO } from "../invoiceDto";
import { refundableCents } from "../cancelService";
import { toClientShipmentDTO, toCustomerShipmentDTO } from "../shipmentDto";
import { bookingSchema } from "../shipmentSchemas";
import { normalizeStripeEvent } from "../payments/stripe";
import { buildMockWebhook } from "../payments/mock";
import { MockPaymentProvider } from "../payments/mock";

const okInput = { billingModes: ["pay_at_booking", "invoice"] as ("pay_at_booking" | "invoice")[], creditLimitCents: 100_000, usedCents: 20_000, overdueCount: 0, totalCents: 10_000 };

describe("who may book on credit", () => {
  it("allows a booking inside the limit", () => {
    expect(decideInvoiceBooking(okInput)).toEqual({ ok: true });
  });

  it("allows a booking that lands exactly on the limit", () => {
    expect(decideInvoiceBooking({ ...okInput, usedCents: 90_000, totalCents: 10_000 })).toEqual({ ok: true });
  });

  it("refuses one cent over the limit", () => {
    const r = decideInvoiceBooking({ ...okInput, usedCents: 90_000, totalCents: 10_001 });
    expect(r).toMatchObject({ ok: false, code: "credit_exceeded" });
  });

  it("refuses accounts without the invoice mode or without a limit", () => {
    expect(decideInvoiceBooking({ ...okInput, billingModes: ["pay_at_booking"] })).toMatchObject({ ok: false, code: "invoice_not_allowed" });
    expect(decideInvoiceBooking({ ...okInput, creditLimitCents: null })).toMatchObject({ ok: false, code: "invoice_not_allowed" });
    expect(decideInvoiceBooking({ ...okInput, creditLimitCents: 0 })).toMatchObject({ ok: false, code: "invoice_not_allowed" });
  });

  it("an overdue invoice blocks credit even when there is room", () => {
    expect(decideInvoiceBooking({ ...okInput, overdueCount: 1 })).toMatchObject({ ok: false, code: "invoice_overdue" });
  });
});

describe("invoice lines", () => {
  const sh = (over: any = {}) => ({
    _id: "s1",
    reference: "EX-1",
    status: "label_ready",
    plannedShipDate: "2026-10-20",
    shipper: { city: "Toronto" },
    recipient: { city: "Nairobi", countryCode: "KE" },
    billing: { mode: "invoice", chargeCents: 9000, creditedCents: 0 },
    ...over,
  });

  it("bills the net amount: charge less what was credited", () => {
    expect(netBillable({ billing: { mode: "invoice", chargeCents: 9000, creditedCents: 2500 } } as any)).toBe(6500);
    expect(netBillable({ billing: { mode: "invoice", chargeCents: 9000, creditedCents: 9000 } } as any)).toBe(0);
    expect(netBillable({ billing: { mode: "invoice", chargeCents: 9000, creditedCents: 99999 } } as any)).toBe(0);
    expect(netBillable({} as any)).toBe(0);
  });

  it("uses the amount recorded when the booking was claimed, not a later value", () => {
    const { lines, totalCents } = buildInvoiceLines([sh({ billing: { mode: "invoice", chargeCents: 9000, creditedCents: 3000, billedCents: 6000 } })] as any, []);
    expect(lines[0].amountCents).toBe(6000);
    expect(totalCents).toBe(6000);
  });

  it("lists bookings then credits as negative lines, and totals them", () => {
    const { lines, totalCents } = buildInvoiceLines([sh(), sh({ _id: "s2", reference: "EX-2", billing: { mode: "invoice", chargeCents: 4000, creditedCents: 0 } })] as any, [
      { amountCents: 2500, reason: "EX-3: damaged", shipmentId: "s3" },
    ]);
    expect(lines.map((l) => [l.kind, l.amountCents])).toEqual([["shipment", 9000], ["shipment", 4000], ["credit", -2500]]);
    expect(totalCents).toBe(10_500);
    expect(lines[2].description).toContain("damaged");
  });

  it("marks a partly charged cancelled booking", () => {
    const { lines } = buildInvoiceLines([sh({ status: "cancelled", billing: { mode: "invoice", chargeCents: 9000, creditedCents: 8000 } })] as any, []);
    expect(lines[0].description).toContain("cancelled");
    expect(lines[0].amountCents).toBe(1000);
  });

  it("credits larger than the bookings give a non-positive total, so no invoice is issued", () => {
    const { totalCents } = buildInvoiceLines([sh({ billing: { mode: "invoice", chargeCents: 1000, creditedCents: 0 } })] as any, [{ amountCents: 5000, reason: "x" }]);
    expect(totalCents).toBeLessThanOrEqual(0);
  });
});

describe("due dates and overdue", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  it("adds whole days", () => {
    expect(addDays(now, 7).toISOString()).toBe("2026-10-27T12:00:00.000Z");
    expect(addDays(now, -7).toISOString()).toBe("2026-10-13T12:00:00.000Z");
  });
  it("only an unpaid invoice past its due date is overdue", () => {
    expect(isOverdue({ status: "issued", dueAt: new Date("2026-10-19T00:00:00Z") }, now)).toBe(true);
    expect(isOverdue({ status: "issued", dueAt: new Date("2026-10-21T00:00:00Z") }, now)).toBe(false);
    expect(isOverdue({ status: "paid", dueAt: new Date("2026-10-01T00:00:00Z") }, now)).toBe(false);
    expect(isOverdue({ status: "void", dueAt: new Date("2026-10-01T00:00:00Z") }, now)).toBe(false);
    expect(displayStatus({ status: "issued", dueAt: new Date("2026-10-19T00:00:00Z") }, now)).toBe("overdue");
  });
});

describe("what each side sees of an invoice", () => {
  const doc: any = {
    _id: "i1",
    number: "EXI-2026-000001",
    status: "issued",
    userId: "owner",
    accountId: "acct",
    totalCents: 10_000,
    issuedAt: new Date("2026-10-01T00:00:00Z"),
    dueAt: new Date("2099-01-01T00:00:00Z"),
    paymentTermsDays: 7,
    lines: [{ kind: "shipment", shipmentId: "s1", reference: "EX-1", description: "x", amountCents: 10_000 }],
    payment: { state: "paid", provider: "stripe", sessionId: "cs_secret", paymentIntentId: "pi_secret", attempts: 2, duplicatePayments: [] },
    paidBy: "staff9",
    voidedBy: "staff8",
    reminderCount: 2,
  };

  it("the client view has no provider ids, staff ids or reminder counts", () => {
    const dto = toClientInvoiceDTO(doc);
    expect(dto.canPay).toBe(true);
    expect(dto.lines).toHaveLength(1);
    const json = JSON.stringify(dto);
    for (const leak of ["cs_secret", "pi_secret", "staff9", "staff8", "acct", "owner", "reminder"]) expect(json).not.toContain(leak);
  });

  it("the staff view adds the owner, the payment and the reminders", () => {
    const dto = toAdminInvoiceDTO(doc, { name: "N", email: "e@x.co", companyName: "C" });
    expect(dto.owner.email).toBe("e@x.co");
    expect(dto.payment.paymentIntentId).toBe("pi_secret");
    expect(dto.reminderCount).toBe(2);
  });

  it("only an unpaid invoice can be paid", () => {
    expect(toClientInvoiceDTO({ ...doc, status: "paid" }).canPay).toBe(false);
    expect(toClientInvoiceDTO({ ...doc, status: "void" }).canPay).toBe(false);
  });
});

describe("credit on a cancellation", () => {
  it("an invoice booking can give back its charge less what was already credited", () => {
    expect(refundableCents({ payment: {} as any, billing: { mode: "invoice", chargeCents: 9000, creditedCents: 2000 } as any })).toBe(7000);
    expect(refundableCents({ payment: {} as any, billing: { mode: "invoice", chargeCents: 9000, creditedCents: 9000 } as any })).toBe(0);
  });

  it("a card booking is unchanged: amount paid less refunds", () => {
    expect(refundableCents({ payment: { amountCents: 5000, refundedCents: 1500 } as any })).toBe(3500);
    expect(refundableCents({ payment: {} as any })).toBe(0);
  });
});

describe("shipments on credit in the DTOs", () => {
  const sh: any = { _id: "s1", reference: "EX-1", status: "label_ready", totalCents: 9000, userId: "u", accountId: "a", accountType: "b2b", billing: { mode: "invoice", chargeCents: 9000, creditedCents: 0, invoiceId: "inv9" }, payment: { state: "paid", provider: "invoice" } };
  it("the client sees how it is billed and which invoice, not amounts of credit", () => {
    expect(toClientShipmentDTO(sh).billing).toEqual({ mode: "invoice", invoiceId: "inv9" });
    expect(toClientShipmentDTO({ ...sh, billing: undefined }).billing).toBeNull();
  });
  it("a partner's customer never sees billing details", () => {
    expect(toCustomerShipmentDTO(sh).billing).toBeNull();
  });
});

describe("booking input", () => {
  const base = {
    quoteId: "q",
    idempotencyKey: "abcdefghijklmnopqr",
    shipper: { name: "A", line1: "1 St", city: "Toronto", postalCode: "M5V1A1", phone: "+14165550100", email: "a@b.co" },
    recipient: { name: "B", line1: "2 St", city: "Nairobi", postalCode: "00100", countryCode: "KE", phone: "+254700000000" },
    items: [{ description: "Books", hsCode: "490199", quantity: 1, unitValueCents: 5000, countryOfOrigin: "CA", netWeightKg: 1, exportReason: "gift" }],
    acceptTerms: true,
    termsVersion: "1",
  };
  it("the payment method is optional and limited to card or invoice", () => {
    expect(bookingSchema.safeParse(base).success).toBe(true);
    expect(bookingSchema.safeParse({ ...base, paymentMethod: "invoice" }).success).toBe(true);
    expect(bookingSchema.safeParse({ ...base, paymentMethod: "card" }).success).toBe(true);
    expect(bookingSchema.safeParse({ ...base, paymentMethod: "cash" }).success).toBe(false);
  });
});

describe("invoice payments through the provider", () => {
  it("an invoice event carries the invoice id and is never mistaken for a booking", () => {
    const { payload } = buildMockWebhook({ eventId: "evt_1", type: "checkout.session.completed", sessionId: "cs_1", invoiceId: "inv123", reference: "EXI-1", amountCents: 5000, paid: true });
    const event = normalizeStripeEvent(JSON.parse(payload));
    expect(event.invoiceId).toBe("inv123");
    expect(event.shipmentId).toBeUndefined();
  });

  it("a booking event still carries the shipment id and no invoice id", () => {
    const { payload } = buildMockWebhook({ eventId: "evt_2", type: "checkout.session.completed", sessionId: "cs_2", shipmentId: "ship456", reference: "EX-1", amountCents: 5000, paid: true });
    const event = normalizeStripeEvent(JSON.parse(payload));
    expect(event.shipmentId).toBe("ship456");
    expect(event.invoiceId).toBeUndefined();
  });

  it("the test-mode provider opens a checkout page for an invoice", async () => {
    const session = await new MockPaymentProvider().createCheckoutSession({
      invoiceId: "inv1",
      reference: "EXI-1",
      amountCents: 1000,
      description: "d",
      successUrl: "http://localhost:3000/express/invoices/inv1?paid=1",
      cancelUrl: "http://localhost:3000/express/invoices/inv1?cancelled=1",
      idempotencyKey: "k-1",
      expiresInMinutes: 30,
    });
    expect(session.url).toMatch(/\/express\/mock-pay\/cs_mock_/);
  });
});
