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
    postalCode: a.postalCode,
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
  // VERIFY: DHL's accepted exportReasonType values. Free text goes in exportReason.
  const reason = items[0]?.exportReason;
  if (reason === "return") return "return";
  if (reason === "repair") return "temporary";
  return "permanent";
}

/** Maps a DHL event type code to our neutral status. VERIFY the full code list. */
export function mapTrackingStatus(typeCode: string): TrackingStatus {
  switch (typeCode) {
    case "OK":
      return "delivered";
    case "WC":
      return "out_for_delivery";
    case "RT":
      return "returned";
    case "RD":
    case "UD":
    case "MS":
    case "HO":
    case "CA":
    case "OH":
    case "NH":
      return "exception";
    case "PL":
      return "pre_transit";
    default:
      return "in_transit";
  }
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
      surcharges.push({ code: line.serviceCode || line.name, name: line.name, amountCents });
    }
  });
  return { baseFreightCents, surcharges };
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
          accountNumber: this.config.accountNumber,
          plannedShippingDateAndTime: dhlDateTime(request.plannedShipDate, "10:00:00"),
          unitOfMeasurement: "metric",
          isCustomsDeclarable: request.isCustomsDeclarable,
          monetaryAmount: [
            { typeCode: "declaredValue", value: fromCents(request.declaredValueCents), currency: "CAD" },
          ],
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
        // The API returns our account rate only. VERIFY whether a list price is available.
        publicList: undefined,
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
    const senderPays = request.dutiesPayer === "sender";
    const response = await this.http.request<DhlShipmentResponse>({
      method: "POST",
      path: "/shipments",
      mutating: true,
      body: {
        plannedShippingDateAndTime: dhlDateTime(request.plannedShipDate, "12:00:00"),
        pickup: { isRequested: request.pickupRequested },
        productCode: request.serviceCode,
        accounts: [
          { typeCode: "shipper", number: this.config.accountNumber },
          // VERIFY: billing the sender for duties and taxes.
          ...(senderPays ? [{ typeCode: "duties-taxes", number: this.config.accountNumber }] : []),
        ],
        customerDetails: {
          shipperDetails: { postalAddress: postalAddress(request.shipper), contactInformation: contactInformation(request.shipper) },
          receiverDetails: { postalAddress: postalAddress(request.recipient), contactInformation: contactInformation(request.recipient) },
        },
        content: {
          packages: packagesPayload(request.parcels).map((p) => ({ ...p, customerReferences: [{ value: request.reference, typeCode: "CU" }] })),
          isCustomsDeclarable: true,
          declaredValue: fromCents(request.declaredValueCents),
          declaredValueCurrency: "CAD",
          description: request.contentDescription,
          unitOfMeasurement: "metric",
          incoterm: senderPays ? "DDP" : "DAP", // VERIFY
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
        },
        // VERIFY: service code for "duties and taxes paid".
        ...(senderPays ? { valueAddedServices: [{ serviceCode: "DD" }] } : {}),
        outputImageProperties: {
          imageOptions: [{ typeCode: "label", templateName: "ECOM26_84_001" }],
        },
      },
    });

    const labelDoc = response.documents?.find((d) => d.typeCode === "label");
    if (!labelDoc?.content) {
      // The parcel exists at DHL but we have no label: caller must look it up, not re-book.
      throw new CarrierError("unknown", "DHL booked the shipment but returned no label.", {
        detail: response.shipmentTrackingNumber,
        outcomeUnknown: true,
      });
    }

    return {
      trackingNumber: response.shipmentTrackingNumber,
      trackingUrl: response.trackingUrl || `${TRACKING_URL}${response.shipmentTrackingNumber}`,
      packageTrackingNumbers: response.packages?.map((p) => p.trackingNumber) ?? [response.shipmentTrackingNumber],
      label: { contentBase64: labelDoc.content, format: "pdf" },
      pickupConfirmation: request.pickupRequested ? response.dispatchConfirmationNumber : undefined,
    };
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
        accounts: [{ typeCode: "shipper", number: this.config.accountNumber }],
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
            productCode: "P",
            accountNumber: this.config.accountNumber,
            isCustomsDeclarable: true,
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

    const raw = response.shipments?.[0]?.events ?? [];
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
