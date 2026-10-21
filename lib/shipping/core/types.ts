/**
 * Carrier-neutral types for Transimex Express.
 *
 * Rules:
 *  - Money is always integer cents in CAD. Never floats.
 *  - Nothing outside a carrier's own folder (lib/shipping/carriers/<id>/) may
 *    use that carrier's field names. Core code talks only to CarrierAdapter.
 *  - `account` prices are what the carrier charges Transimex. They are
 *    staff-only and must never reach a client response (see Phase 2 serializers).
 */

export type CarrierId = "dhl";

export type Cents = number;

export type Currency = "CAD";

export interface Surcharge {
  /** Carrier's own code, e.g. fuel or remote area. */
  code: string;
  name: string;
  amountCents: Cents;
}

export interface RatePrice {
  baseFreightCents: Cents;
  surcharges: Surcharge[];
  /** baseFreightCents + all surcharges. */
  totalCents: Cents;
}

export interface Address {
  name?: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  /** Province / state. */
  region?: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2. */
  countryCode: string;
  phone?: string;
  email?: string;
}

export interface Parcel {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export type ExportReason = "sale" | "gift" | "sample" | "return" | "repair" | "personal_effects";

export interface CustomsItem {
  description: string;
  /** Harmonized System (tariff) code. */
  hsCode: string;
  quantity: number;
  unitValueCents: Cents;
  /** ISO alpha-2 country of origin. */
  countryOfOrigin: string;
  netWeightKg: number;
  exportReason: ExportReason;
}

export type DutiesPayer = "recipient" | "sender";

/** Paper documents with no commercial value, or goods. Documents need no customs paperwork. */
export type ContentType = "documents" | "goods";

// --- Rates -----------------------------------------------------------------

export interface RateRequest {
  origin: Pick<Address, "countryCode" | "postalCode" | "city">;
  destination: Pick<Address, "countryCode" | "postalCode" | "city">;
  parcels: Parcel[];
  declaredValueCents: Cents;
  isCustomsDeclarable: boolean;
  /** YYYY-MM-DD. */
  plannedShipDate: string;
  /** True when the client wants DHL to collect the parcel, so the carrier can quote its pickup fee. */
  pickupRequested?: boolean;
  /** Defaults to goods. Documents are quoted as a non-customs shipment on the carrier's document product. */
  contentType?: ContentType;
}

export interface RateOption {
  carrier: CarrierId;
  serviceCode: string;
  serviceName: string;
  currency: Currency;
  /** What the carrier charges Transimex. STAFF ONLY. */
  account: RatePrice;
  /**
   * The carrier's public list price, when the carrier supplies one. Some
   * carrier APIs return only the account rate; confirm in the sandbox.
   */
  publicList?: RatePrice;
  /**
   * The carrier's pickup fee for this shipment, when pickup was requested and
   * the carrier supplies it. Passed through to the client, never discounted.
   */
  pickupFeeCents?: Cents;
  /** ISO timestamp. */
  estimatedDelivery?: string;
}

// --- Address validation ----------------------------------------------------

export interface AddressValidation {
  valid: boolean;
  /** False when the carrier does not serve this destination. */
  serviceable: boolean;
  suggestions: Address[];
  warnings: string[];
}

// --- Shipments -------------------------------------------------------------

export interface ShipmentRequest {
  /** Our ExpressShipment id. Doubles as the idempotency reference. */
  reference: string;
  serviceCode: string;
  shipper: Address;
  recipient: Address;
  parcels: Parcel[];
  items: CustomsItem[];
  declaredValueCents: Cents;
  contentDescription: string;
  /** YYYY-MM-DD. */
  plannedShipDate: string;
  dutiesPayer: DutiesPayer;
  /** True when the carrier should collect from the shipper's address. */
  pickupRequested: boolean;
  /** Defaults to goods. For documents `items` is empty and no customs declaration is sent. */
  contentType?: ContentType;
}

export interface ShipmentLabel {
  /** Base64-encoded file content. Labels never show prices. */
  contentBase64: string;
  format: "pdf";
}

export interface ShipmentResult {
  trackingNumber: string;
  /** Carrier's own public tracker URL. */
  trackingUrl: string;
  packageTrackingNumbers: string[];
  label: ShipmentLabel;
  /** Present when the carrier confirmed a pickup together with the shipment. */
  pickupConfirmation?: string;
  /** The commercial invoice for a goods shipment, when the carrier produced one. */
  invoice?: { contentBase64: string };
  /**
   * True when customs paperwork travels electronically (DHL Paperless Trade), so nothing has to be
   * printed and attached. False means the invoice must be printed and attached to the parcel.
   */
  paperless?: boolean;
}

// --- Pickup ----------------------------------------------------------------

export interface PickupRequest {
  reference: string;
  trackingNumber: string;
  address: Address;
  contactName: string;
  contactPhone: string;
  /** ISO timestamp for the start of the pickup window. */
  readyAt: string;
  /** ISO timestamp for the end of the pickup window. */
  closeAt: string;
  parcels: Parcel[];
  instructions?: string;
  contentType?: ContentType;
  /** Goods only: DHL needs the declared value to book the pickup. */
  declaredValueCents?: Cents;
}

export interface PickupResult {
  confirmationNumber: string;
  /** ISO timestamp. */
  scheduledFor: string;
}

// --- Tracking --------------------------------------------------------------

export type TrackingStatus =
  | "unknown"
  | "pre_transit"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "returned";

export interface TrackingEvent {
  /** ISO timestamp. */
  timestamp: string;
  status: TrackingStatus;
  description: string;
  location?: string;
}

export interface TrackingResult {
  trackingNumber: string;
  status: TrackingStatus;
  /** Newest first. */
  events: TrackingEvent[];
}
