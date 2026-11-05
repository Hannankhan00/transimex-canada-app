import type {
  Address,
  AddressValidation,
  CarrierId,
  PickupCancelRequest,
  PickupCancelResult,
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

  /**
   * Cancels a booked pickup. Safe to repeat: DHL answers "already cancelled" instead of failing. Cancelling
   * the pickup does NOT cancel the shipment or its label, and DHL may cancel a whole consolidated pickup.
   */
  cancelPickup(request: PickupCancelRequest): Promise<PickupCancelResult>;

  /**
   * Current status and events. `bookedAt` (ISO) is a hint for test doubles that age a
   * parcel across server restarts; a real carrier ignores it. A parcel DHL has
   * not scanned yet throws CarrierError "not_found".
   */
  track(trackingNumber: string, hints?: { bookedAt?: string }): Promise<TrackingResult>;
}
