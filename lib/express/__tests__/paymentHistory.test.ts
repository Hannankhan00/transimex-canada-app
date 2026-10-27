import { describe, expect, it } from "vitest";
import { buildPaymentHistory } from "../paymentHistory";

const card = (id: string, reference: string, paidAt: string, amountCents: number, refunds: { amountCents: number; at: string; refundId?: string }[] = []) => ({
  _id: id,
  reference,
  payment: { provider: "stripe", state: "paid", amountCents, paidAt, refunds },
});

describe("payment history", () => {
  it("lists card payments, paid invoices and refunds from newest to oldest, with totals", () => {
    const h = buildPaymentHistory(
      [card("s1", "EX-1", "2026-10-20T10:00:00Z", 10000, [{ amountCents: 2500, at: "2026-10-22T09:00:00Z", refundId: "re_1" }]), card("s2", "EX-2", "2026-10-25T10:00:00Z", 4000)],
      [{ _id: "i1", number: "EXI-2026-000001", totalCents: 30000, paidAt: "2026-10-23T12:00:00Z", paidMethod: "manual" }]
    );
    expect(h.entries.map((e) => `${e.kind}:${e.reference}:${e.amountCents}`)).toEqual(["booking:EX-2:4000", "invoice:EXI-2026-000001:30000", "refund:EX-1:-2500", "booking:EX-1:10000"]);
    expect(h.paidCents).toBe(44000);
    expect(h.refundedCents).toBe(2500);
    expect(h.netCents).toBe(41500);
    expect(h.entries.find((e) => e.kind === "invoice")?.method).toBe("manual");
    expect(h.entries.find((e) => e.kind === "booking")?.href).toBe("/express/shipments/s2");
  });

  it("leaves out bookings that were never paid by card, such as ones put on the account's credit", () => {
    const h = buildPaymentHistory(
      [
        { _id: "a", reference: "EX-A", payment: { provider: "invoice", state: "paid", amountCents: 9000, paidAt: "2026-10-20T10:00:00Z" } },
        { _id: "b", reference: "EX-B", payment: { provider: "stripe", state: "pending", amountCents: 9000 } },
        { _id: "c", reference: "EX-C" },
      ],
      [{ _id: "i", number: "EXI-1", totalCents: 100 }]
    );
    expect(h.entries).toEqual([]);
    expect(h.netCents).toBe(0);
  });

  it("never exposes provider or payment ids", () => {
    const sh: any = card("s1", "EX-1", "2026-10-20T10:00:00Z", 1000, [{ amountCents: 100, at: "2026-10-21T10:00:00Z", refundId: "re_SECRET" }]);
    sh.payment.paymentIntentId = "pi_SECRET";
    sh.payment.sessionId = "cs_SECRET";
    const json = JSON.stringify(buildPaymentHistory([sh], []));
    expect(json).not.toMatch(/SECRET|pi_|cs_test|"re_/);
  });
});
