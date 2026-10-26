import { describe, expect, it } from "vitest";
import { publicListPrice, splitBreakdown } from "../carriers/dhl/live";
import { buildRatePrice } from "../core/money";

// Lines as the sandbox returned them for a Montreal sender (75% contract discount) and a US sender (none).
const canadian: any[] = [
  { name: "EXPRESS WORLDWIDE", price: 33.49, priceBreakdown: [{ priceType: "DISCOUNT", rate: 75, price: 100.46, basePrice: 133.95 }] },
  { name: "GOGREEN PLUS - CARBON REDUCED", serviceCode: "FD", price: 0.54 },
  { name: "FUEL SURCHARGE", serviceCode: "FF", price: 12.56, priceBreakdown: [{ priceType: "DISCOUNT", rate: 75, price: 37.67, basePrice: 50.23 }] },
];
const american: any[] = [
  { name: "EXPRESS WORLDWIDE", price: 153.17 },
  { name: "GOGREEN PLUS - CARBON REDUCED", serviceCode: "FD", price: 0.3 },
  { name: "FUEL SURCHARGE", serviceCode: "FF", price: 57.44 },
];

function priced(lines: any[], origin: string) {
  const { baseFreightCents, surcharges } = splitBreakdown("D", lines as any);
  const account = buildRatePrice(baseFreightCents, surcharges);
  return { account, list: publicListPrice("D", lines as any, account, surcharges, origin) };
}

// Abidjan to Montreal as the sandbox returned it: a 20% credit (ZF, negative) and an automatic value protection line.
const intoCanada: any[] = [
  { name: "EXPRESS WORLDWIDE", price: 383.01, priceBreakdown: [{ priceType: "DISCOUNT", rate: 75, price: 1149.03, basePrice: 1532.04 }] },
  { name: "CHARGE", serviceCode: "ZF", price: -76.6 },
  { name: "GOGREEN PLUS - CARBON REDUCED", serviceCode: "FD", price: 4.5 },
  { name: "DEMAND SURCHARGE", serviceCode: "NX", price: 9.75 },
  { name: "FUEL SURCHARGE", serviceCode: "FF", price: 146.3, priceBreakdown: [{ priceType: "DISCOUNT", rate: 74.53, price: 428.02, basePrice: 574.32 }] },
  { name: "SHIPMENT VALUE PROTECTION", serviceCode: "II", price: 4.1 },
];

describe("DHL credits (negative lines)", () => {
  it("keeps a negative line as a named credit, and the total still matches what DHL bills", () => {
    const { account, list } = priced(intoCanada, "CI");
    expect(account.baseFreightCents).toBe(38301);
    expect(account.surcharges[0]).toEqual({ code: "ZF", name: "DHL credit", amountCents: -7660 });
    expect(account.totalCents).toBe(47106); // DHL's own total: 471.06
    // The public list price is DHL's list price. The credit is a line on both sides, so it reaches the client.
    expect(list?.baseFreightCents).toBe(153204);
    expect(list?.surcharges[0]).toEqual({ code: "ZF", name: "DHL credit", amountCents: -7660 });
  });
});

describe("DHL public list price", () => {
  it("is DHL's own list price when DHL shows the discount it applied", () => {
    const { account, list } = priced(canadian, "CA");
    expect(account.baseFreightCents).toBe(3349);
    expect(list?.baseFreightCents).toBe(13395);
    // Surcharges pass through at the amount DHL charges, discounted or not.
    expect(list?.surcharges.map((s) => s.amountCents)).toEqual([54, 1256]);
  });

  it("is the account price itself outside Canada, where the contract discount does not apply", () => {
    const { account, list } = priced(american, "US");
    expect(list).toEqual(account);
    expect(list?.baseFreightCents).toBe(15317);
  });

  it("is unknown for a Canadian origin with no discount shown, so pricing uses the contract setting", () => {
    expect(priced(american, "CA").list).toBeUndefined();
  });
});
