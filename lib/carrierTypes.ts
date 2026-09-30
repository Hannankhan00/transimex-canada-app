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
  accountNumber?: string;
  awbPrefix?: string;
  status: CarrierStatus;
  notes?: string;
}

/** Road and Rail carriers run their own equipment and drivers, so they carry a
 * cargo insurance policy and fleet units. Ocean lines and airlines don't: their
 * liability is set by the B/L or AWB terms, and there's no driver to dispatch. */
export function carriesOwnInsurance(mode: TransportMode): boolean {
  return mode === "Road" || mode === "Rail";
}

/** True only if the carrier's status and insurance both allow a new load assignment. */
export function isCarrierAssignable(carrier: {
  status: CarrierStatus;
  primaryMode?: TransportMode;
  insurance: { expiryDate: string };
}): boolean {
  if (carrier.status !== "Active") return false;
  if (carrier.primaryMode && !carriesOwnInsurance(carrier.primaryMode)) return true;
  const expiry = new Date(carrier.insurance.expiryDate).getTime();
  return !Number.isNaN(expiry) && expiry > Date.now();
}
