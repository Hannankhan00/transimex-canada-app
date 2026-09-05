import { TransportMode, CarrierStatus } from "@/models/Carrier";

export type TransportModeType = TransportMode;
export type VendorStatusType = CarrierStatus;

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
