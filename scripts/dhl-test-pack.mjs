/**
 * DHL Express (MyDHL API) sandbox test pack runner.
 *
 *   node scripts/dhl-test-pack.mjs              run all 15 cases
 *   node scripts/dhl-test-pack.mjs 1 6 13       run only these case numbers
 *   node scripts/dhl-test-pack.mjs --pickup     also book a pickup for each outbound case
 *   node scripts/dhl-test-pack.mjs --track      only re-fetch tracking for shipments already booked (run it
 *                                               a few hours after booking: DHL needs time to show scans)
 *
 * For each case it writes, under dhl-test-pack/<case>/:
 *   01-rating-request.json / 02-rating-response.json
 *   02b-capability-response.json                        (GET /products: which products DHL offers on the lane)
 *   03-shipment-request.json / 04-shipment-response.json
 *   05-tracking-response.json
 *   06-pickup-request.json / 07-pickup-response.json   (with --pickup, outbound only)
 *   label.pdf, invoice.pdf, waybill.pdf                 (whatever DHL returns)
 *   08-document-retrieval.json                          (GET get-image for the waybill and commercial invoice)
 * and dhl-test-pack/results.csv with pass/fail and the waybill number.
 *
 * Talks to the sandbox only: refuses to run unless DHL_MODE=sandbox.
 * Credentials come from .env.local. Raw MyDHL payloads are built here on purpose: the test
 * pack needs imperial units, insurance, neutral delivery, data staging and inbound shippers,
 * which the booking adapter (lib/shipping/carriers/dhl/live.ts) does not use.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const { DHL_MODE, DHL_API_KEY, DHL_API_SECRET } = process.env;
if (DHL_MODE !== "sandbox") throw new Error(`Refusing to run: DHL_MODE is "${DHL_MODE}", expected "sandbox".`);
if (!DHL_API_KEY || !DHL_API_SECRET) throw new Error("DHL_API_KEY / DHL_API_SECRET missing.");
const BASE = (process.env.DHL_API_BASE_URL || "https://express.api.dhl.com/mydhlapi/test").replace(/\/+$/, "");
const AUTH = Buffer.from(`${DHL_API_KEY}:${DHL_API_SECRET}`).toString("base64");

const OUT = path.join(process.cwd(), "dhl-test-pack");
const args = process.argv.slice(2);
const withPickup = args.includes("--pickup");
const trackOnly = args.includes("--track");
const only = args.filter((a) => /^\d+$/.test(a)).map(Number);

const OUTBOUND_ACCOUNT = "973995169";
const INBOUND_ACCOUNT = "974044956";

// ---- Parties ------------------------------------------------------------------
// DHL requires the postalCode key even for countries without postal codes (NG, AG): send "".
// The sheet says "Any" for the shipper postal code and receiver address: these are test values.
const SHIPPER_CA = {
  postalAddress: { postalCode: process.env.TEST_SHIPPER_POSTAL || "H4E 4N4", cityName: "Montreal", provinceCode: "QC", countryCode: "CA", addressLine1: process.env.TEST_SHIPPER_LINE1 || "1 Test Street" },
  contactInformation: { companyName: "Transimex Canada", fullName: "Transimex Shipping", phone: "+15145550100", email: "sales@canzova.com" },
};
const SHIPPER_US = {
  postalAddress: { postalCode: "10000", cityName: "New York", provinceCode: "NY", countryCode: "US", addressLine1: "1 Test Avenue" },
  contactInformation: { companyName: "Transimex Test Shipper", fullName: "Test Shipper", phone: "+12125550100", email: "sales@canzova.com" },
};
const SHIPPER_DE = {
  postalAddress: { postalCode: "10082", cityName: "Berlin", countryCode: "DE", addressLine1: "Teststrasse 1" },
  contactInformation: { companyName: "Transimex Test Shipper", fullName: "Test Shipper", phone: "+4930555010", email: "sales@canzova.com" },
};
const SHIPPER_NO = {
  postalAddress: { postalCode: "0001", cityName: "Oslo", countryCode: "NO", addressLine1: "Testgata 1" },
  contactInformation: { companyName: "Transimex Test Shipper", fullName: "Test Shipper", phone: "+4722555010", email: "sales@canzova.com" },
};

const to = (cityName, countryCode, postalCode, extra = {}) => ({
  postalAddress: { cityName, countryCode, postalCode: postalCode || "", addressLine1: "1 Test Street", ...extra },
  contactInformation: { companyName: "Test Receiver", fullName: "Test Receiver", phone: "+15145550199", email: "receiver@example.com" },
});

// ---- Cases --------------------------------------------------------------------
// units: "imperial" (lb / in) or "metric" (kg / cm). pkgs: [weight, length, width, height].
// items: [description, hsCode, qty, totalValue, manufacturerCountry].
const CASES = [
  { n: 1, name: "AM-CA-CH-DOX", dir: "out", shipper: SHIPPER_CA, receiver: to("Bern", "CH", "3011"), product: "D", dutiable: false, desc: "Documents", units: "imperial", pkgs: [[1, 5, 5, 5]] },
  { n: 2, name: "AM-CA-CN-WPX", dir: "out", shipper: SHIPPER_CA, receiver: to("Liyang", "CN", "213375"), product: "P", dutiable: true, units: "metric", pkgs: [[2, 10, 10, 10]], items: [["Audio CDs, pre-recorded music compact discs", "8523.49", 2, 100, "CA"]], reason: "permanent", incoterm: "DAP", services: [{ serviceCode: "WY" }], ref: "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789" },
  { n: 3, name: "AM-CA-GB-TDT", dir: "out", shipper: SHIPPER_CA, receiver: to("London", "GB", "EC4A 1EN"), product: "T", dutiable: false, desc: "Passport", units: "imperial", pkgs: [[1, 9, 9, 1]] },
  { n: 4, name: "AM-CA-NG-WPX", dir: "out", shipper: SHIPPER_CA, receiver: to("Wudil", "NG", ""), product: "P", dutiable: true, units: "imperial", pkgs: [[2, 15, 10, 5]], items: [["Men's knitted cotton t-shirts, short sleeve", "6109.10", 1, 50, "CA"]], reason: "permanent", incoterm: "DAP" },
  { n: 5, name: "AM-CA-FR-TDK", dir: "out", shipper: SHIPPER_CA, receiver: to("Paris", "FR", "75001"), product: "K", dutiable: false, desc: "Photos", units: "imperial", pkgs: [[1, 13, 8, 1]] },
  { n: 6, name: "AM-CA-US-TDM", dir: "out", shipper: SHIPPER_CA, receiver: to("Bonita", "US", "91902", { provinceCode: "CA" }), product: "M", dutiable: true, units: "imperial", pkgs: [[20, 18, 18, 18], [20, 18, 18, 18], [20, 18, 18, 18]], items: [["Automotive brake pads, ceramic, for passenger cars", "8708.30", 3, 1500, "CN"]], reason: "permanent", incoterm: "DDP", dutiesAccount: OUTBOUND_ACCOUNT, insurance: { value: 1500, currency: "CAD" }, services: [{ serviceCode: "WY" }] },
  { n: 7, name: "AM-CA-US-WPX", dir: "out", shipper: SHIPPER_CA, receiver: to("Provo", "US", "84601", { provinceCode: "UT" }), product: "P", dutiable: true, units: "imperial", pkgs: [[185, 42, 42, 12]], items: [["Product samples, plastic injection-molded parts", "3926.90", 3, 600, "TW"]], reason: "return", incoterm: "DAP", services: [{ serviceCode: "NN" }, { serviceCode: "PT" }] },
  { n: 8, name: "AM-CA-US-TDL", dir: "out", shipper: SHIPPER_CA, receiver: to("Cincinnati", "US", "45236", { provinceCode: "OH" }), product: "L", dutiable: false, desc: "Brochures", units: "imperial", pkgs: [[2, 10, 10, 1], [3, 12, 5, 2]] },
  { n: 9, name: "AM-CA-AU-TDE", dir: "out", shipper: SHIPPER_CA, receiver: to("Sydney", "AU", "2000", { provinceCode: "NSW" }), product: "E", dutiable: true, units: "imperial", pkgs: [[3, 30, 5, 8]], items: [["Women's leather handbags, medium size", "4202.21", 2, 100, "CA"]], reason: "permanent", incoterm: "DAP" },
  { n: 10, name: "AM-CA-MX-WPX", dir: "out", shipper: SHIPPER_CA, receiver: to("Guadalajara", "MX", "44100"), product: "P", dutiable: true, units: "imperial", pkgs: [[1, 5, 5, 5]], items: [["Women's cotton knitted blouses", "6106.10", 1, 500, "CN"]], reason: "permanent", incoterm: "DAP", services: [{ serviceCode: "WY" }] },
  { n: 11, name: "AM-CA-US-TDY", dir: "out", shipper: SHIPPER_CA, receiver: to("New York", "US", "10000", { provinceCode: "NY" }), product: "Y", dutiable: true, units: "imperial", pkgs: [[5, 9, 9, 1], [2, 10, 5, 5]], items: [["Women's dresses, woven cotton, evening wear", "6204.42", 4, 1000, "DE"]], reason: "permanent", incoterm: "DAP", services: [{ serviceCode: "WY" }] },
  { n: 12, name: "AM-CA-BR-WPX", dir: "out", shipper: SHIPPER_CA, receiver: to("Sao Paulo", "BR", "01003"), product: "P", dutiable: true, units: "imperial", pkgs: [[2, 15, 10, 5]], items: [["Men's leather belts, finished, buckle type", "4203.30", 1, 50, "CA"]], reason: "permanent", incoterm: "DDP", dutiesAccount: OUTBOUND_ACCOUNT, services: [{ serviceCode: "WY" }] },
  { n: 13, name: "AM-US-CA-DOX", dir: "in", shipper: SHIPPER_US, receiver: to("Brampton", "CA", "L6T 5M1", { provinceCode: "ON" }), product: "D", dutiable: false, desc: "Reports", units: "imperial", pkgs: [[1, 5, 5, 2]] },
  { n: 14, name: "EU-DE-AG-WPX", dir: "in", shipper: SHIPPER_DE, receiver: to("Saint John's", "AG", "", { addressLine2: "Aberdeen" }), product: "P", dutiable: true, units: "metric", pkgs: [[1, 2, 3, 4]], items: [["Electronic components, integrated circuits", "8542.31", 3, 150, "US"]], reason: "permanent", incoterm: "DDP", dutiesAccount: INBOUND_ACCOUNT },
  { n: 15, name: "EU-NO-NL-WPX", dir: "in", shipper: SHIPPER_NO, receiver: to("Amsterdam", "NL", "1011"), product: "P", dutiable: true, units: "metric", pkgs: [[2, 40, 30, 20]], items: [["Personal computer, laptop, used", "8471.30", 1, 400, "NO"]], reason: "temporary", incoterm: "DAP", services: [{ serviceCode: "AA" }], friday: true },
];

// ---- Helpers ------------------------------------------------------------------
function shipDate(friday) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  while (friday ? d.getUTCDay() !== 5 : [0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const accountFor = (c) => (c.dir === "in" ? INBOUND_ACCOUNT : OUTBOUND_ACCOUNT);
const pkgPayload = (c) => c.pkgs.map(([weight, length, width, height]) => ({ weight, dimensions: { length, width, height } }));
const totalValue = (c) => (c.items || []).reduce((s, i) => s + i[3], 0);

function valueAddedServices(c) {
  const list = [...(c.services || [])];
  if (c.insurance) list.push({ serviceCode: "II", value: c.insurance.value, currency: c.insurance.currency });
  return list;
}

function ratingRequest(c) {
  return {
    customerDetails: {
      shipperDetails: { postalCode: c.shipper.postalAddress.postalCode, cityName: c.shipper.postalAddress.cityName, countryCode: c.shipper.postalAddress.countryCode },
      receiverDetails: { postalCode: c.receiver.postalAddress.postalCode, cityName: c.receiver.postalAddress.cityName, countryCode: c.receiver.postalAddress.countryCode },
    },
    accounts: [{ typeCode: "shipper", number: accountFor(c) }],
    plannedShippingDateAndTime: `${shipDate(c.friday)}T12:00:00GMT+00:00`,
    unitOfMeasurement: c.units,
    isCustomsDeclarable: c.dutiable,
    ...(c.dutiable ? { monetaryAmount: [{ typeCode: "declaredValue", value: totalValue(c), currency: "CAD" }] } : {}),
    requestAllValueAddedServices: false,
    returnStandardProductsOnly: false,
    nextBusinessDay: false,
    packages: pkgPayload(c),
  };
}

function shipmentRequest(c) {
  const date = shipDate(c.friday);
  const vas = valueAddedServices(c);
  const body = {
    plannedShippingDateAndTime: `${date}T12:00:00GMT+00:00`,
    pickup: { isRequested: false },
    productCode: c.product,
    accounts: [
      { typeCode: "shipper", number: accountFor(c) },
      ...(c.dutiesAccount ? [{ typeCode: "duties-taxes", number: c.dutiesAccount }] : []),
    ],
    customerDetails: { shipperDetails: c.shipper, receiverDetails: c.receiver },
    content: {
      packages: pkgPayload(c).map((p, i) => ({ ...p, customerReferences: [{ typeCode: "CU", value: `${c.name}-${i + 1}` }] })),
      isCustomsDeclarable: c.dutiable,
      // DHL asks that the description matches the first line item.
      description: (c.dutiable ? c.items[0][0] : c.desc).slice(0, 70),
      unitOfMeasurement: c.units,
      incoterm: c.dutiable ? c.incoterm : "DAP",
      ...(c.dutiable
        ? {
            declaredValue: totalValue(c),
            declaredValueCurrency: "CAD",
            exportDeclaration: {
              lineItems: c.items.map(([description, hsCode, qty, total, origin], i) => ({
                number: i + 1,
                description,
                price: Math.round((total / qty) * 100) / 100,
                quantity: { value: qty, unitOfMeasurement: "PCS" },
                commodityCodes: [{ typeCode: "outbound", value: hsCode.replace(".", "") }],
                exportReasonType: c.reason,
                manufacturerCountry: origin,
                weight: { netValue: Math.max(0.1, Math.round((c.pkgs.reduce((s, p) => s + p[0], 0) / c.items.reduce((s, it) => s + it[2], 0)) * 100) / 100), grossValue: Math.max(0.1, Math.round((c.pkgs.reduce((s, p) => s + p[0], 0) / c.items.reduce((s, it) => s + it[2], 0)) * 100) / 100) },
              })),
              invoice: { number: c.name, date },
              exportReason: c.reason === "return" ? "return" : c.reason === "temporary" ? "temporary export" : "sale",
              exportReasonType: c.reason,
            },
          }
        : {}),
    },
    outputImageProperties: {
      printerDPI: 300,
      encodingFormat: "pdf",
      imageOptions: [
        { typeCode: "label", templateName: "ECOM26_84_001" },
        { typeCode: "waybillDoc", templateName: "ARCH_8X4", isRequested: true, hideAccountNumber: false, numberOfCopies: 1 },
        ...(c.dutiable ? [{ typeCode: "invoice", templateName: "COMMERCIAL_INVOICE_P_10", isRequested: true, invoiceType: "commercial", languageCode: "eng" }] : []),
      ],
    },
    ...(vas.length ? { valueAddedServices: vas } : {}),
    ...(c.ref ? { customerReferences: [{ typeCode: "CU", value: c.ref }] } : {}),
  };
  return body;
}

function pickupRequest(c) {
  const date = shipDate(false);
  return {
    plannedPickupDateAndTime: `${date}T14:00:00GMT+00:00`,
    closeTime: "18:00",
    location: "reception",
    locationType: "business",
    accounts: [{ typeCode: "shipper", number: accountFor(c) }],
    customerDetails: { shipperDetails: c.shipper },
    shipmentDetails: [
      { productCode: c.product, accounts: [{ typeCode: "shipper", number: accountFor(c) }], isCustomsDeclarable: c.dutiable, ...(c.dutiable ? { declaredValue: totalValue(c), declaredValueCurrency: "CAD" } : {}), unitOfMeasurement: c.units, packages: pkgPayload(c) },
    ],
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, urlPath, body) {
  // Stay under DHL's rate limit (429).
  await sleep(1200);
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: { Authorization: `Basic ${AUTH}`, Accept: "application/json", "x-version": "3.3.4", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

const save = (dir, file, data) => fs.writeFileSync(path.join(dir, file), typeof data === "string" ? data : JSON.stringify(data, null, 2));
const message = (r) => (r.ok ? "" : String(r.json?.detail || r.json?.title || r.json?.message || JSON.stringify(r.json)).replace(/[\r\n"]+/g, " ").slice(0, 300));

// ---- Run ----------------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const rows = [["case", "test case", "rating", "shipment", "pickup", "pass/fail", "waybill", "message"]];

if (trackOnly) {
  for (const d of fs.readdirSync(OUT).filter((x) => /^\d\d-/.test(x)).sort()) {
    if (only.length && !only.includes(Number(d.slice(0, 2)))) continue;
    const resp = JSON.parse(fs.readFileSync(path.join(OUT, d, "04-shipment-response.json"), "utf8"));
    const w = resp.shipmentTrackingNumber;
    if (!w) continue;
    const tr = await call("GET", `/shipments/${w}/tracking`);
    save(path.join(OUT, d), "05-tracking-response.json", tr.json);
    console.log(`${d}  ${w}  tracking ${tr.status}`);
  }
  process.exit(0);
}

for (const c of CASES) {
  if (only.length && !only.includes(c.n)) continue;
  const dir = path.join(OUT, `${String(c.n).padStart(2, "0")}-${c.name}`);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`\n#${c.n} ${c.name}`);

  const ratingReq = ratingRequest(c);
  save(dir, "01-rating-request.json", ratingReq);
  const rating = await call("POST", "/rates", ratingReq);
  save(dir, "02-rating-response.json", rating.json);
  const offered = (rating.json.products || []).map((p) => p.productCode);
  const productOk = offered.includes(c.product);
  console.log(`  rating   ${rating.status}  products: ${offered.join(",") || "-"}${rating.ok && !productOk ? `  (!) ${c.product} not offered` : ""}`);

  // Capability: which DHL products exist on this lane.
  const sh = c.shipper.postalAddress;
  const rc = c.receiver.postalAddress;
  const toKg = (w) => (c.units === "imperial" ? w * 0.45359237 : w);
  const toCm = (v) => (c.units === "imperial" ? v * 2.54 : v);
  const [w0, l0, wd0, h0] = c.pkgs[0];
  const capQuery = new URLSearchParams({
    accountNumber: accountFor(c),
    originCountryCode: sh.countryCode,
    originCityName: sh.cityName,
    originPostalCode: sh.postalCode,
    destinationCountryCode: rc.countryCode,
    destinationCityName: rc.cityName,
    destinationPostalCode: rc.postalCode,
    weight: toKg(w0).toFixed(2),
    length: toCm(l0).toFixed(1),
    width: toCm(wd0).toFixed(1),
    height: toCm(h0).toFixed(1),
    plannedShippingDate: shipDate(c.friday),
    isCustomsDeclarable: String(c.dutiable),
    unitOfMeasurement: "metric",
  });
  // Countries without postal codes (NG, AG) send none: an empty value is rejected here.
  for (const [k, v] of [...capQuery]) if (v === "") capQuery.delete(k);
  const capability = await call("GET", `/products?${capQuery}`);
  save(dir, "02b-capability-response.json", capability.json);
  console.log(`  capability ${capability.status}  ${(capability.json.products || []).map((p) => p.productCode).join(",") || message(capability)}`);

  const shipReq = shipmentRequest(c);
  save(dir, "03-shipment-request.json", shipReq);
  const ship = await call("POST", "/shipments", shipReq);
  save(dir, "04-shipment-response.json", ship.json);
  const waybill = ship.json.shipmentTrackingNumber || "";
  console.log(`  shipment ${ship.status}  ${waybill || message(ship)}`);
  for (const doc of ship.json.documents || []) {
    if (doc.content) fs.writeFileSync(path.join(dir, `${doc.typeCode}.${(doc.imageFormat || "pdf").toLowerCase()}`), Buffer.from(doc.content, "base64"));
  }

  // The waybill is not part of the booking response on this account, so try DHL's document retrieval too.
  const retrieval = {};
  if (waybill) {
    const month = shipDate(c.friday).slice(0, 7);
    for (const type of ["waybill", "commercial-invoice"]) {
      if (type === "commercial-invoice" && !c.dutiable) continue;
      const g = await call("GET", `/shipments/${waybill}/get-image?shipperAccountNumber=${accountFor(c)}&typeCode=${type}&pickupYearAndMonth=${month}&encodingFormat=pdf`);
      retrieval[type] = { status: g.status, detail: g.ok ? "ok" : message(g) };
      const doc = (g.json.documents || [])[0];
      if (g.ok && doc?.content) fs.writeFileSync(path.join(dir, `${type === "waybill" ? "waybill" : "invoice-retrieved"}.pdf`), Buffer.from(doc.content, "base64"));
    }
    save(dir, "08-document-retrieval.json", retrieval);
    console.log(`  documents ${Object.entries(retrieval).map(([k, v]) => `${k}:${v.status}`).join(" ")}`);
  }

  let trackStatus = "-";
  if (waybill) {
    const tr = await call("GET", `/shipments/${waybill}/tracking`);
    save(dir, "05-tracking-response.json", tr.json);
    trackStatus = String(tr.status);
    console.log(`  tracking ${tr.status}`);
  }

  let pickupStatus = "-";
  if (withPickup && c.dir === "out" && waybill) {
    const pReq = pickupRequest(c);
    save(dir, "06-pickup-request.json", pReq);
    const pr = await call("POST", "/pickups", pReq);
    save(dir, "07-pickup-response.json", pr.json);
    pickupStatus = String(pr.status);
    console.log(`  pickup   ${pr.status}  ${(pr.json.dispatchConfirmationNumbers || [])[0] || message(pr)}`);
  }

  const pass = rating.ok && productOk && ship.ok && waybill;
  rows.push([c.n, c.name, rating.status, ship.status, pickupStatus, pass ? "PASS" : "FAIL", waybill, [!rating.ok && `rating: ${message(rating)}`, rating.ok && !productOk && `product ${c.product} not offered`, !ship.ok && `shipment: ${message(ship)}`].filter(Boolean).join(" | ")]);
}

fs.writeFileSync(path.join(OUT, "results.csv"), rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n"));
console.log(`\nDone. Files in ${OUT}`);
