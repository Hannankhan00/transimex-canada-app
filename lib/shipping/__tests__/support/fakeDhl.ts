import { createHash } from "node:crypto";
import type { CarrierAdapter } from "../../core/adapter";
import { CarrierError } from "../../core/errors";
import { buildRatePrice } from "../../core/money";
import type {
  Address,
  AddressValidation,
  PickupRequest,
  PickupResult,
  RateOption,
  RateRequest,
  ShipmentRequest,
  ShipmentResult,
  Surcharge,
  TrackingEvent,
  TrackingResult,
  TrackingStatus,
} from "../../core/types";

/**
 * TEST HELPER ONLY. Not part of the app: the running site can never produce a fake label or fake rates.
 * Stand-in for DHL for the unit tests. It returns believable,
 * deterministic data in the same neutral shapes as the live adapter, so
 * everything built on top (pricing, booking, Stripe) works unchanged when the
 * real adapter replaces it. The numbers are illustrative, not DHL's.
 */

interface Zone {
  /** Base charge for the first 0.5 kg, in cents (public list price). */
  baseCents: number;
  /** Per additional kg, in cents (public list price). */
  perKgCents: number;
  transitDays: number;
}

const ZONES: Record<string, Zone> = {
  north: { baseCents: 7500, perKgCents: 1900, transitDays: 4 }, // Morocco, Algeria, Tunisia, Egypt
  west: { baseCents: 9200, perKgCents: 2400, transitDays: 5 }, // Senegal, Ivory Coast, Ghana, Nigeria, Cameroon...
  east: { baseCents: 10400, perKgCents: 2800, transitDays: 6 }, // Kenya, Ethiopia, Tanzania, Uganda...
  south: { baseCents: 11200, perKgCents: 3100, transitDays: 6 }, // South Africa and neighbours
  world: { baseCents: 12800, perKgCents: 3400, transitDays: 5 }, // everywhere else
};

const COUNTRY_ZONE: Record<string, keyof typeof ZONES> = {
  MA: "north", DZ: "north", TN: "north", EG: "north",
  SN: "west", CI: "west", GH: "west", NG: "west", CM: "west", BJ: "west", TG: "west", ML: "west", BF: "west", GN: "west", GA: "west", CG: "west", CD: "west",
  KE: "east", ET: "east", TZ: "east", UG: "east", RW: "east", DJ: "east", MG: "east", MU: "east",
  ZA: "south", ZW: "south", ZM: "south", MZ: "south", BW: "south", NA: "south", AO: "south",
};

/** Countries the mock treats as not serviced, to exercise that path. */
const NOT_SERVICED = new Set(["SS", "SO", "LY", "SD"]);

/** The account rate is a fixed share of the public list price. */
const ACCOUNT_RATE_SHARE = 0.4;
const FUEL_SURCHARGE_RATE = 0.22;
const REMOTE_AREA_FEE_CENTS = 2800;
/** Illustrative DHL pickup fee. The real amount comes from DHL. */
const MOCK_PICKUP_FEE_CENTS = 1500;
const VOLUMETRIC_DIVISOR = 5000;

/** Mock rule: a postal code ending in "99" is a remote area. */
export function isMockRemoteArea(postalCode: string): boolean {
  return /99$/.test(postalCode.replace(/\s+/g, ""));
}

function chargeableWeightKg(request: RateRequest): number {
  const total = request.parcels.reduce((sum, p) => {
    const volumetric = (p.lengthCm * p.widthCm * p.heightCm) / VOLUMETRIC_DIVISOR;
    return sum + Math.max(p.weightKg, volumetric);
  }, 0);
  // DHL rounds up to the next 0.5 kg.
  return Math.max(0.5, Math.ceil(total * 2) / 2);
}

function priceForZone(zone: Zone, weightKg: number, remote: boolean, share: number) {
  const extraKg = Math.max(0, weightKg - 0.5);
  const listBase = zone.baseCents + zone.perKgCents * extraKg;
  const base = Math.round(listBase * share);
  // Surcharges are the same on the public price and on our account rate (DHL
  // discounts base freight only), and are computed from the list base freight.
  const surcharges: Surcharge[] = [
    { code: "FF", name: "Fuel surcharge", amountCents: Math.round(listBase * FUEL_SURCHARGE_RATE) },
  ];
  if (remote) {
    surcharges.push({ code: "OO", name: "Remote area delivery", amountCents: REMOTE_AREA_FEE_CENTS });
  }
  return buildRatePrice(base, surcharges);
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Tiny valid single-page PDF so label download paths can be tested end to end. */
function buildMockLabelPdf(trackingNumber: string): string {
  const text = `MOCK DHL EXPRESS LABEL ${trackingNumber}`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 288 432] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${`BT /F1 12 Tf 20 400 Td (${text}) Tj ET`.length} >>\nstream\nBT /F1 12 Tf 20 400 Td (${text}) Tj ET\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1").toString("base64");
}

const TRACKING_STEPS: { afterHours: number; status: TrackingStatus; description: string; location: string }[] = [
  { afterHours: 0, status: "pre_transit", description: "Shipment information received", location: "Toronto, CA" },
  { afterHours: 12, status: "in_transit", description: "Picked up / received at origin facility", location: "Toronto, CA" },
  { afterHours: 36, status: "in_transit", description: "Departed origin country", location: "Toronto, CA" },
  { afterHours: 72, status: "in_transit", description: "Arrived at destination hub", location: "Destination hub" },
  { afterHours: 96, status: "out_for_delivery", description: "With delivery courier", location: "Destination city" },
  { afterHours: 108, status: "delivered", description: "Delivered", location: "Destination city" },
];

export class MockDhlAdapter implements CarrierAdapter {
  readonly carrier = "dhl" as const;

  /** Shipment creation time by tracking number, so tracking can advance. */
  private readonly created = new Map<string, number>();

  private readonly now: () => number;
  private readonly omitPublicList: boolean;

  /**
   * omitPublicList mimics a DHL API that returns only our account rate, so the
   * "rebuild the public price from the contract discount" path can be tested.
   */
  constructor(options: { now?: () => number; omitPublicList?: boolean } = {}) {
    this.now = options.now ?? Date.now;
    this.omitPublicList = options.omitPublicList ?? false;
  }

  async getRates(request: RateRequest): Promise<RateOption[]> {
    const country = request.destination.countryCode.toUpperCase();
    if (NOT_SERVICED.has(country)) {
      throw new CarrierError("not_serviced", `Destination ${country} is not serviced.`);
    }
    const zoneKey = COUNTRY_ZONE[country] ?? "world";
    const zone = ZONES[zoneKey];
    const weightKg = chargeableWeightKg(request);
    const remote = isMockRemoteArea(request.destination.postalCode);

    const estimated = new Date(`${request.plannedShipDate}T12:00:00Z`);
    estimated.setUTCDate(estimated.getUTCDate() + zone.transitDays);

    const documents = request.contentType === "documents";
    return [
      {
        carrier: "dhl",
        serviceCode: documents ? "D" : "P",
        serviceName: documents ? "EXPRESS WORLDWIDE DOC" : "EXPRESS WORLDWIDE",
        currency: "CAD",
        account: priceForZone(zone, weightKg, remote, ACCOUNT_RATE_SHARE),
        publicList: this.omitPublicList ? undefined : priceForZone(zone, weightKg, remote, 1),
        pickupFeeCents: request.pickupRequested ? MOCK_PICKUP_FEE_CENTS : undefined,
        estimatedDelivery: estimated.toISOString(),
      },
    ];
  }

  async validateAddress(address: Address): Promise<AddressValidation> {
    const country = address.countryCode.toUpperCase();
    const serviceable = !NOT_SERVICED.has(country) && country in COUNTRY_ZONE;
    const warnings: string[] = [];
    if (serviceable && isMockRemoteArea(address.postalCode)) {
      warnings.push("Remote area: a remote area surcharge applies.");
    }
    return {
      valid: Boolean(address.city.trim() && address.postalCode.trim()),
      serviceable,
      suggestions: [],
      warnings,
    };
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResult> {
    // Same reference always yields the same tracking number: a repeated call
    // cannot produce a second parcel.
    const trackingNumber = `MOCK${BigInt(`0x${hash(request.reference).slice(0, 12)}`).toString().padStart(10, "0").slice(0, 10)}`;
    if (!this.created.has(trackingNumber)) this.created.set(trackingNumber, this.now());

    return {
      trackingNumber,
      trackingUrl: `https://www.dhl.com/ca-en/home/tracking.html?tracking-id=${trackingNumber}`,
      packageTrackingNumbers: request.parcels.map((_, i) => `${trackingNumber}-${i + 1}`),
      label: { contentBase64: buildMockLabelPdf(trackingNumber), format: "pdf" },
      pickupConfirmation: request.pickupRequested ? `PUMOCK${trackingNumber.slice(-6)}` : undefined,
    };
  }

  async bookPickup(request: PickupRequest): Promise<PickupResult> {
    return {
      confirmationNumber: `PUMOCK${hash(request.reference).slice(0, 6).toUpperCase()}`,
      scheduledFor: request.readyAt,
    };
  }

  async track(trackingNumber: string, hints: { bookedAt?: string } = {}): Promise<TrackingResult> {
    if (!trackingNumber.startsWith("MOCK")) {
      throw new CarrierError("not_found", `Unknown tracking number ${trackingNumber}.`);
    }
    const hinted = hints.bookedAt ? new Date(hints.bookedAt).getTime() : NaN;
    const createdAt = this.created.get(trackingNumber) ?? (Number.isFinite(hinted) ? hinted : this.now());
    // Test hook: DHL_MOCK_TRACKING_SPEED=60 makes the mock parcel age 60x faster.
    const speed = Number(process.env.DHL_MOCK_TRACKING_SPEED);
    const elapsedHours = ((this.now() - createdAt) / 3_600_000) * (Number.isFinite(speed) && speed > 0 ? speed : 1);

    const events: TrackingEvent[] = TRACKING_STEPS.filter((s) => elapsedHours >= s.afterHours)
      .map((s) => ({
        timestamp: new Date(createdAt + s.afterHours * 3_600_000).toISOString(),
        status: s.status,
        description: s.description,
        location: s.location,
      }))
      .reverse();

    return { trackingNumber, status: events[0]?.status ?? "unknown", events };
  }
}
