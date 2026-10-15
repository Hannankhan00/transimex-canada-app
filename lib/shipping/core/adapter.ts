import type {
  Address,
  AddressValidation,
  CarrierId,
  PickupRequest,
  PickupResult,
  RateOption,
  RateRequest,
  ShipmentRequest,
  ShipmentResult,
  TrackingResult,
} from "./types";

/**
 * The only surface core code may use to talk to a carrier. A carrier's own
 * field names never appear outside its folder.
 */
export interface CarrierAdapter {
  readonly carrier: CarrierId;

  /** Rate options, split into base freight and surcharges, in CAD cents. */
  getRates(request: RateRequest): Promise<RateOption[]>;

  /** Checks a destination so remote-area fees appear before a quote is locked. */
  validateAddress(address: Address): Promise<AddressValidation>;

  /**
   * Books the shipment and returns the label. Never retried automatically: on a
   * timeout this throws CarrierError with outcomeUnknown set, and the caller
   * must look the shipment up before trying again.
   */
  createShipment(request: ShipmentRequest): Promise<ShipmentResult>;

  bookPickup(request: PickupRequest): Promise<PickupResult>;

  track(trackingNumber: string): Promise<TrackingResult>;
}
