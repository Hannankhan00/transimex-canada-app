import { describe, expect, it } from "vitest";
import { dhlActualSchema, dhlInvoiceCreateSchema, parseDhlInvoiceCsv, parseMoneyToCents } from "../dhlCost";

describe("DHL cost input", () => {
  it("turns dollars into whole cents and lets staff clear a charge", () => {
    expect(dhlActualSchema.parse({ charge: 61.41 }).charge).toBe(6141);
    expect(dhlActualSchema.parse({ charge: null }).charge).toBeNull();
    expect(dhlActualSchema.safeParse({ charge: -1 }).success).toBe(false);
  });

  it("requires an invoice number and total, and a real date", () => {
    expect(dhlInvoiceCreateSchema.parse({ number: " YULR1 ", total: 10.5 })).toMatchObject({ number: "YULR1", total: 1050 });
    expect(dhlInvoiceCreateSchema.safeParse({ number: "", total: 5 }).success).toBe(false);
    expect(dhlInvoiceCreateSchema.safeParse({ number: "A", total: 5, issuedOn: "31/10/2026" }).success).toBe(false);
  });
});

describe("parseMoneyToCents", () => {
  it("reads common money formats", () => {
    expect(parseMoneyToCents("1,234.56")).toBe(123456);
    expect(parseMoneyToCents("$1 234,56")).toBe(123456);
    expect(parseMoneyToCents("61.41")).toBe(6141);
    expect(parseMoneyToCents("(12.30)")).toBe(-1230);
    expect(parseMoneyToCents("1,234")).toBe(123400);
    expect(parseMoneyToCents("n/a")).toBeNull();
  });
});

describe("parseDhlInvoiceCsv", () => {
  it("finds the waybill and total columns and adds up repeated waybills", () => {
    const csv = ['Invoice Number,Waybill Number,Weight in Lb,Total Amount (excl. VAT),Tax Amount', "Y1,5163353333,10,61.41,0", 'Y1,"5163353333",,3.00,0', "Y1,5163354444,4,100.00,5.00", "Y1,,4,9.00,0", "Y1,5163355555,4,abc,0"].join("\n");
    const r = parseDhlInvoiceCsv(csv);
    expect(r.error).toBeUndefined();
    expect(r.lines).toEqual([
      { waybill: "5163353333", chargeCents: 6441 },
      { waybill: "5163354444", chargeCents: 10000 },
    ]);
    expect(r.skipped).toBe(2);
  });

  it("reads semicolon files", () => {
    const r = parseDhlInvoiceCsv("Waybill;Total amount\n5163353333;61,41");
    expect(r.lines).toEqual([{ waybill: "5163353333", chargeCents: 6141 }]);
  });

  it("says so when it cannot find the columns", () => {
    expect(parseDhlInvoiceCsv("a,b\n1,2").error).toMatch(/waybill/i);
    expect(parseDhlInvoiceCsv("only a header").error).toBeTruthy();
  });
});
