import { TransportMode, CarrierStatus } from "@/models/Carrier";

export type TransportModeType = TransportMode;
export type VendorStatusType = CarrierStatus;

export interface FleetUnit {
  id: string;
  driverName: string;
  vehicleType: string;
  plateNumber: string;
  active: boolean;
}

export interface CarrierVendor {
  id: string;
  name: string;
  code: string;
  primaryMode: TransportMode;
  supportedModes: TransportMode[];
  dispatchContact: {
    name: string;
    phone: string;
    email: string;
    emergencyPhone?: string;
  };
  headquarters: string;
  operatingLanes: string[];
  fleetSize: string;
  units: FleetUnit[];
  rating: number;
  totalShipmentsCompleted: number;
  onTimeDeliveryRate: string;
  insurance: {
    policyNumber: string;
    coverageAmount: string;
    expiryDate: string;
    isCompliant: boolean;
  };
  status: CarrierStatus;
  notes?: string;
}

/** True only if the carrier's status and insurance both allow a new load assignment. */
export function isCarrierAssignable(carrier: {
  status: CarrierStatus;
  insurance: { expiryDate: string };
}): boolean {
  if (carrier.status !== "Active") return false;
  const expiry = new Date(carrier.insurance.expiryDate).getTime();
  return !Number.isNaN(expiry) && expiry > Date.now();
}
