import type { DhlConfig } from "@/lib/express/config";
import type { CarrierAdapter } from "../../core/adapter";
import { CarrierError } from "../../core/errors";
import { buildRatePrice, fromCents, toCents } from "../../core/money";
import type {
  Address,
  AddressValidation,
  CustomsItem,
  Parcel,
  PickupRequest,
  PickupResult,
  RateOption,
  RatePrice,
  RateRequest,
  ShipmentRequest,
  ShipmentResult,
  Surcharge,
  TrackingEvent,
  TrackingResult,
  TrackingStatus,
} from "../../core/types";
import { DhlHttpClient } from "./client";

/**
 * Real DHL Express (MyDHL API) adapter. All DHL field names live in this file.
 *
 * Written from DHL's published API shape BEFORE sandbox access. Every spot
 * marked VERIFY must be confirmed against real sandbox responses (saved as
 * fixtures) before go-live: price type names, which breakdown line is the base
 * freight, surcharge codes for Africa, customs fields, the duties-paid service
 * code, tracking event codes, and the not-serviced response.
 */

const TRACKING_URL = "https://www.dhl.com/ca-en/home/tracking.html?tracking-id=";

// ---- DHL response shapes (only the fields we read) ---------------------------

interface DhlPrice {
  currencyType: string;
  priceCurrency: string;
  price: number;
}

interface DhlBreakdownLine {
  name: string;
  serviceCode?: string;
  price: number;
  /** Present when DHL applied a discount to this line: the list price before it is `basePrice`. */
  priceBreakdown?: { priceType?: string; rate?: number; price?: number; basePrice?: number }[];
}

interface DhlRatesResponse {
  products?: {
    productName: string;
    productCode: string;
    totalPrice?: DhlPrice[];
    detailedPriceBreakdown?: { currencyType: string; priceCurrency: string; breakdown: DhlBreakdownLine[] }[];
    deliveryCapabilities?: { estimatedDeliveryDateAndTime?: string };
  }[];
}

interface DhlShipmentResponse {
  shipmentTrackingNumber: string;
  trackingUrl?: string;
  packages?: { trackingNumber: string }[];
  documents?: { typeCode: string; imageFormat?: string; content: string }[];
  dispatchConfirmationNumber?: string;
}

interface DhlPickupResponse {
  dispatchConfirmationNumbers?: string[];
  nextPickupDate?: string;
}

interface DhlTrackingResponse {
  shipments?: {
    events?: {
      date: string;
      time: string;
      typeCode: string;
      description: string;
      serviceArea?: { description?: string }[];
    }[];
  }[];
}

interface DhlAddressValidateResponse {
  address?: { countryCode: string; postalCode: string; cityName: string }[];
  warnings?: string[];
}

// ---- Mapping helpers -------------------------------------------------------

function dhlDateTime(date: string, time = "12:00:00"): string {
  return `${date}T${time}GMT+00:00`;
}

function packagesPayload(parcels: Parcel[]) {
  return parcels.map((p) => ({
    weight: p.weightKg,
    dimensions: { length: p.lengthCm, width: p.widthCm, height: p.heightCm },
  }));
}

function postalAddress(a: Pick<Address, "line1" | "line2" | "city" | "region" | "postalCode" | "countryCode">) {
  return {
    // DHL requires this key even for countries without postal codes: an empty string is accepted.
    postalCode: a.postalCode || "",
    cityName: a.city,
    countryCode: a.countryCode.toUpperCase(),
    ...(a.line1 ? { addressLine1: a.line1 } : {}),
    ...(a.line2 ? { addressLine2: a.line2 } : {}),
    ...(a.region ? { provinceCode: a.region } : {}),
  };
}

function contactInformation(a: Address) {
  return {
    phone: a.phone || "",
    ...(a.email ? { email: a.email } : {}),
    companyName: a.company || a.name || "Private",
    fullName: a.name || a.company || "",
  };
}

function exportReasonType(items: CustomsItem[]): string {
  // Values from DHL's OpenAPI enum (v3.3.4). Free text goes in exportReason.
  switch (items[0]?.exportReason) {
    case "return":
      return "return";
    case "repair":
      return "temporary";
    case "gift":
      return "gift";
    case "sample":
      return "sample";
    case "personal_effects":
      return "personal_belongings_or_personal_use";
    default:
      return "commercial_purpose_or_sale";
  }
}

/** The value and export declaration for a goods shipment. Documents send neither. */
function customsContent(request: ShipmentRequest) {
  return {
    declaredValue: fromCents(request.declaredValueCents),
    declaredValueCurrency: "CAD",
    exportDeclaration: {
      lineItems: request.items.map((item, i) => ({
        number: i + 1,
        description: item.description,
        price: fromCents(item.unitValueCents),
        quantity: { value: item.quantity, unitOfMeasurement: "PCS" },
        commodityCodes: [{ typeCode: "outbound", value: item.hsCode }],
        exportReasonType: exportReasonType(request.items),
        manufacturerCountry: item.countryOfOrigin.toUpperCase(),
        weight: { netValue: item.netWeightKg, grossValue: item.netWeightKg },
      })),
      invoice: { number: request.reference, date: request.plannedShipDate },
      exportReason: request.items[0]?.exportReason ?? "sale",
      exportReasonType: exportReasonType(request.items),
    },
  };
}

/**
 * DHL's own list (MyDHL API reference data, trackingEventCode sheet, v3.3.4)
 * marks some events as not visible to customers (internal scans such as
 * "Load vehicle" or "Weigh & dimension"). They are dropped from the timeline.
 */
const HIDDEN_EVENT_CODES = new Set(["BL", "CI", "CU", "DG", "DI", "DM", "DP", "ES", "HI", "HN", "HO", "IA", "LV", "MF", "NA", "PW", "RW", "SI", "ST", "TD", "TI", "TT", "UV"]);

/** Events that happen before DHL has the parcel. */
const PRE_TRANSIT_CODES = new Set(["SD", "EM"]);

/** Events that mean something needs attention: a failed delivery, a hold, a refusal, a clearance delay. */
const EXCEPTION_CODES = new Set(["BA", "CA", "CC", "CD", "CM", "DS", "HP", "MC", "MD", "MS", "ND", "NH", "OH", "PD", "RD", "SS", "TP", "UD"]);

export const isVisibleTrackingEvent = (typeCode: string) => !HIDDEN_EVENT_CODES.has(typeCode);

/** Maps a DHL event type code to our neutral status, using DHL's published event codes. Anything else is plain movement. */
export function mapTrackingStatus(typeCode: string): TrackingStatus {
  if (typeCode === "OK" || typeCode === "DD") return "delivered"; // DD = delivered damaged, still delivered
  if (typeCode === "WC") return "out_for_delivery";
  if (typeCode === "RT") return "returned";
  if (EXCEPTION_CODES.has(typeCode)) return "exception";
  if (PRE_TRANSIT_CODES.has(typeCode)) return "pre_transit";
  // PU, SA, AF, DF, PL ("processed at location", a normal hub scan), AR, IC, CR, SM, TR and the rest.
  return "in_transit";
}

/**
 * Splits one product's billing-currency breakdown into base freight and
 * surcharges. VERIFY in sandbox: we assume the line whose serviceCode equals
 * the product code (or, failing that, the first line) is base freight, and
 * every other line is a surcharge passed through at DHL's amount.
 */
export function splitBreakdown(
  productCode: string,
  lines: DhlBreakdownLine[]
): { baseFreightCents: number; surcharges: Surcharge[] } {
  // DHL's sample puts the product line first with no serviceCode, and lists optional
  // services with no price at all. Unpriced lines are not charges, so drop them first.
  lines = lines.filter((l) => typeof l.price === "number");
  const baseIndex = Math.max(
    0,
    lines.findIndex((l) => l.serviceCode === productCode)
  );
  const surcharges: Surcharge[] = [];
  let baseFreightCents = 0;
  lines.forEach((line, i) => {
    const amountCents = toCents(line.price);
    if (i === baseIndex) {
      baseFreightCents = amountCents;
    } else if (amountCents !== 0) {
      // A negative line (ZF "CHARGE", a 20% credit DHL gives on shipments to or from Canada) is kept as a
      // negative surcharge. Like every surcharge it passes through to the client at DHL's amount, so the
      // client gets the credit. DHL calls it only "CHARGE", so it is named here.
      surcharges.push({ code: line.serviceCode || line.name, name: amountCents < 0 ? "DHL credit" : line.name, amountCents });
    }
  });
  return { baseFreightCents, surcharges };
}

/**
 * DHL's public (list) price, read from DHL itself instead of guessed from a discount setting.
 *  - The base freight line shows the discount DHL applied: its `basePrice` is the list price.
 *  - No discount shown on a non-Canadian origin: the contract discount only exists on Canadian shipments,
 *    so the account price already is the list price.
 *  - No discount shown on a Canadian origin: unknown, so undefined and the pricing falls back to the
 *    contract discount set in Express Settings.
 */
export function publicListPrice(
  productCode: string,
  lines: DhlBreakdownLine[],
  account: RatePrice,
  surcharges: Surcharge[],
  originCountry: string
): RatePrice | undefined {
  const priced = lines.filter((l) => typeof l.price === "number");
  const base = priced.find((l) => l.serviceCode === productCode) ?? priced[0];
  const discount = base?.priceBreakdown?.find((p) => p.priceType === "DISCOUNT" && typeof p.basePrice === "number");
  if (discount?.basePrice != null) return buildRatePrice(toCents(discount.basePrice), surcharges);
  if (originCountry.toUpperCase() !== "CA") return account;
  return undefined;
}

// ---- Adapter ---------------------------------------------------------------

export class DhlApiAdapter implements CarrierAdapter {
  readonly carrier = "dhl" as const;
  private readonly http: DhlHttpClient;

  constructor(
    private readonly config: DhlConfig,
    http?: DhlHttpClient
  ) {
    this.http = http ?? new DhlHttpClient(config);
  }

  /**
   * The DHL account that pays freight. A shipment starting in Canada uses the main account; one starting anywhere
   * else is an import for DHL and needs the import-enabled account.
   */
  private accountFor(originCountryCode: string): string {
    if (originCountryCode.toUpperCase() === "CA") return this.config.accountNumber;
    if (!this.config.importAccountNumber) {
      throw new CarrierError("config", `Shipments from ${originCountryCode.toUpperCase()} need DHL_IMPORT_ACCOUNT_NUMBER (an import-enabled DHL account).`);
    }
    return this.config.importAccountNumber;
  }

  async getRates(request: RateRequest): Promise<RateOption[]> {
    let response: DhlRatesResponse;
    try {
      response = await this.http.request<DhlRatesResponse>({
        method: "POST",
        path: "/rates",
        body: {
          customerDetails: {
            shipperDetails: {
              postalCode: request.origin.postalCode,
              cityName: request.origin.city,
              countryCode: request.origin.countryCode.toUpperCase(),
            },
            receiverDetails: {
              postalCode: request.destination.postalCode,
              cityName: request.destination.city,
              countryCode: request.destination.countryCode.toUpperCase(),
            },
          },
          // The schema has no top-level accountNumber and rejects unknown keys.
          accounts: [{ typeCode: "shipper", number: this.accountFor(request.origin.countryCode) }],
          plannedShippingDateAndTime: dhlDateTime(request.plannedShipDate, "10:00:00"),
          unitOfMeasurement: "metric",
          isCustomsDeclarable: request.isCustomsDeclarable,
          // Documents have no commercial value to declare.
          ...(request.contentType === "documents" ? {} : { monetaryAmount: [{ typeCode: "declaredValue", value: fromCents(request.declaredValueCents), currency: "CAD" }] }),
          requestAllValueAddedServices: false,
          returnStandardProductsOnly: false,
          nextBusinessDay: false,
          packages: packagesPayload(request.parcels),
        },
      });
    } catch (error) {
      // VERIFY: what DHL returns for an unserviced destination.
      if (error instanceof CarrierError && error.status === 404) {
        throw new CarrierError("not_serviced", "No DHL service for this route.", {
          status: 404,
          detail: error.detail,
        });
      }
      throw error;
    }

    const options: RateOption[] = [];
    for (const product of response.products ?? []) {
      // VERIFY: BILLC is the billing-currency entry. We convert nothing.
      const total = product.totalPrice?.find((p) => p.currencyType === "BILLC");
      const detailed = product.detailedPriceBreakdown?.find((d) => d.currencyType === "BILLC");
      if (!total || !detailed) continue;
      if (total.priceCurrency !== "CAD") {
        throw new CarrierError("config", `DHL billing currency is ${total.priceCurrency}, expected CAD.`);
      }

      const { baseFreightCents, surcharges } = splitBreakdown(product.productCode, detailed.breakdown);
      const account = buildRatePrice(baseFreightCents, surcharges);
      const publicList = publicListPrice(product.productCode, detailed.breakdown, account, surcharges, request.origin.countryCode);
      if (account.totalCents !== toCents(total.price)) {
        throw new CarrierError("unknown", "DHL price breakdown does not add up to its total.", {
          detail: `breakdown ${account.totalCents} vs total ${toCents(total.price)} for ${product.productCode}`,
        });
      }

      options.push({
        carrier: "dhl",
        serviceCode: product.productCode,
        serviceName: product.productName,
        currency: "CAD",
        account,
        // DHL's own list price when it shows the discount it applied; see publicListPrice.
        publicList,
        // VERIFY: whether DHL returns a pickup fee in the rate response. Until confirmed it is left
        // undefined and Transimex falls back to the pickup fee set in Express settings.
        pickupFeeCents: undefined,
        estimatedDelivery: product.deliveryCapabilities?.estimatedDeliveryDateAndTime,
      });
    }
    return options;
  }

  async validateAddress(address: Address): Promise<AddressValidation> {
    try {
      // VERIFY: GET with query parameters.
      const response = await this.http.request<DhlAddressValidateResponse>({
        method: "GET",
        path: "/address-validate",
        query: {
          type: "delivery",
          countryCode: address.countryCode.toUpperCase(),
          postalCode: address.postalCode,
          cityName: address.city,
          strictValidation: "false",
        },
      });
      const matches = response.address ?? [];
      return {
        valid: matches.length > 0,
        serviceable: matches.length > 0,
        suggestions: matches.map((m) => ({
          line1: address.line1,
          city: m.cityName,
          postalCode: m.postalCode,
          countryCode: m.countryCode,
        })),
        warnings: response.warnings ?? [],
      };
    } catch (error) {
      if (error instanceof CarrierError && (error.code === "rejected" || error.code === "not_found")) {
        return { valid: false, serviceable: false, suggestions: [], warnings: [error.detail || error.message] };
      }
      throw error;
    }
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResult> {
    const documents = request.contentType === "documents";
    // Goods go Paperless Trade (WY) when DHL offers it on the lane. DHL refuses WY on some lanes (for example
    // Nigeria, Egypt, Morocco) before booking anything, so asking again without it cannot create a second parcel.
    let paperless = !documents;
    let response: DhlShipmentResponse;
    try {
      response = await this.sendShipment(request, paperless);
    } catch (error) {
      const refusedPaperless = paperless && error instanceof CarrierError && error.code === "rejected" && !error.outcomeUnknown && /\bWY\b|special service/i.test(error.detail || "");
      if (!refusedPaperless) throw error;
      paperless = false;
      response = await this.sendShipment(request, false);
    }

    const labelDoc = response.documents?.find((d) => d.typeCode === "label");
    if (!labelDoc?.content) {
      // The parcel exists at DHL but we have no label: caller must look it up, not re-book.
      throw new CarrierError("unknown", "DHL booked the shipment but returned no label.", {
        detail: response.shipmentTrackingNumber,
        outcomeUnknown: true,
      });
    }
    const invoiceDoc = response.documents?.find((d) => d.typeCode === "invoice");

    return {
      trackingNumber: response.shipmentTrackingNumber,
      trackingUrl: response.trackingUrl || `${TRACKING_URL}${response.shipmentTrackingNumber}`,
      packageTrackingNumbers: response.packages?.map((p) => p.trackingNumber) ?? [response.shipmentTrackingNumber],
      label: { contentBase64: labelDoc.content, format: "pdf" },
      pickupConfirmation: request.pickupRequested ? response.dispatchConfirmationNumber : undefined,
      ...(invoiceDoc?.content ? { invoice: { contentBase64: invoiceDoc.content } } : {}),
      ...(documents ? {} : { paperless }),
    };
  }

  private async sendShipment(request: ShipmentRequest, paperless: boolean): Promise<DhlShipmentResponse> {
    const documents = request.contentType === "documents";
    // Documents carry no duties, so there is nothing for the sender to pay.
    const senderPays = !documents && request.dutiesPayer === "sender";
    return this.http.request<DhlShipmentResponse>({
      method: "POST",
      path: "/shipments",
      mutating: true,
      body: {
        plannedShippingDateAndTime: dhlDateTime(request.plannedShipDate, "12:00:00"),
        pickup: { isRequested: request.pickupRequested },
        productCode: request.serviceCode,
        accounts: [
          { typeCode: "shipper", number: this.accountFor(request.shipper.countryCode) },
          // The sender pays duties and taxes on the same account.
          ...(senderPays ? [{ typeCode: "duties-taxes", number: this.accountFor(request.shipper.countryCode) }] : []),
        ],
        customerDetails: {
          shipperDetails: { postalAddress: postalAddress(request.shipper), contactInformation: contactInformation(request.shipper) },
          receiverDetails: { postalAddress: postalAddress(request.recipient), contactInformation: contactInformation(request.recipient) },
        },
        content: {
          packages: packagesPayload(request.parcels).map((p) => ({ ...p, customerReferences: [{ value: request.reference, typeCode: "CU" }] })),
          isCustomsDeclarable: !documents,
          // The schema requires a description (max 70 characters), an incoterm and the unit for every shipment.
          // For goods DHL wants it to be the first line item's description, which customs reads.
          description: (documents ? request.contentDescription : request.items[0]?.description || request.contentDescription).slice(0, 70),
          unitOfMeasurement: "metric",
          incoterm: senderPays ? "DDP" : "DAP", // VERIFY
          // A document shipment sends no value and no export declaration.
          ...(documents ? {} : customsContent(request)),
        },
        // "DD" = duties and taxes paid by the sender (confirmed in the sandbox); "WY" = Paperless Trade.
        ...(senderPays || paperless ? { valueAddedServices: [...(senderPays ? [{ serviceCode: "DD" }] : []), ...(paperless ? [{ serviceCode: "WY" }] : [])] } : {}),
        outputImageProperties: {
          imageOptions: [
            { typeCode: "label", templateName: "ECOM26_84_001" },
            // Goods need a commercial invoice: electronic with Paperless Trade, otherwise printed and attached.
            ...(documents ? [] : [{ typeCode: "invoice", templateName: "COMMERCIAL_INVOICE_P_10", isRequested: true, invoiceType: "commercial", languageCode: "eng" }]),
          ],
        },
      },
    });
  }

  async bookPickup(request: PickupRequest): Promise<PickupResult> {
    const readyAt = new Date(request.readyAt);
    const closeAt = new Date(request.closeAt);
    const response = await this.http.request<DhlPickupResponse>({
      method: "POST",
      path: "/pickups",
      mutating: true,
      body: {
        plannedPickupDateAndTime: `${readyAt.toISOString().slice(0, 19)}GMT+00:00`,
        closeTime: closeAt.toISOString().slice(11, 16),
        location: request.instructions || "reception",
        locationType: "residence",
        accounts: [{ typeCode: "shipper", number: this.accountFor(request.address.countryCode) }],
        customerDetails: {
          shipperDetails: {
            postalAddress: postalAddress(request.address),
            contactInformation: {
              phone: request.contactPhone,
              fullName: request.contactName,
              companyName: request.address.company || request.contactName,
            },
          },
        },
        shipmentDetails: [
          {
            productCode: request.contentType === "documents" ? "D" : "P",
            accounts: [{ typeCode: "shipper", number: this.accountFor(request.address.countryCode) }],
            isCustomsDeclarable: request.contentType !== "documents",
            // DHL requires the declared value on a pickup for goods.
            ...(request.contentType !== "documents" ? { declaredValue: fromCents(request.declaredValueCents ?? 0), declaredValueCurrency: "CAD" } : {}),
            unitOfMeasurement: "metric",
            packages: packagesPayload(request.parcels),
          },
        ],
      },
    });

    const confirmationNumber = response.dispatchConfirmationNumbers?.[0];
    if (!confirmationNumber) {
      throw new CarrierError("unknown", "DHL did not return a pickup confirmation.", { outcomeUnknown: true });
    }
    return { confirmationNumber, scheduledFor: request.readyAt };
  }

  async track(trackingNumber: string): Promise<TrackingResult> {
    const response = await this.http.request<DhlTrackingResponse>({
      method: "GET",
      path: `/shipments/${encodeURIComponent(trackingNumber)}/tracking`,
    });

    const raw = (response.shipments?.[0]?.events ?? []).filter((e) => isVisibleTrackingEvent(e.typeCode));
    const events: TrackingEvent[] = raw
      .map((e) => ({
        timestamp: new Date(`${e.date}T${e.time}`).toISOString(),
        status: mapTrackingStatus(e.typeCode),
        description: e.description,
        location: e.serviceArea?.[0]?.description,
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return { trackingNumber, status: events[0]?.status ?? "unknown", events };
  }
}
