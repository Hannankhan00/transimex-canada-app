import { CarrierVendor } from "@/lib/carrierTypes";

/** Normalizes a raw Mongoose Carrier document/lean object into the CarrierVendor
 * shape the frontend expects — used everywhere a carrier is returned so `id`
 * fields (top-level and per-unit) are always consistent, regardless of Mongoose's
 * default virtual/serialization behavior. */
export function mapCarrier(c: any): CarrierVendor {
  return {
    id: c._id.toString(),
    name: c.name,
    code: c.code,
    primaryMode: c.primaryMode,
    supportedModes: c.supportedModes || [c.primaryMode],
    dispatchContact: {
      name: c.dispatchContact?.name || "",
      phone: c.dispatchContact?.phone || "",
      email: c.dispatchContact?.email || "",
      emergencyPhone: c.dispatchContact?.emergency247Phone,
    },
    headquarters: c.headquarters || "",
    operatingLanes: c.operatingLanes || [],
    fleetSize: c.fleetSize || "",
    units: (c.units || []).map((u: any) => ({
      id: u._id.toString(),
      driverName: u.driverName || "",
      vehicleType: u.vehicleType || "",
      plateNumber: u.plateNumber || "",
      active: u.active !== false,
    })),
    rating: c.rating ?? 0,
    totalShipmentsCompleted: c.totalShipmentsCompleted || 0,
    onTimeDeliveryRate: c.onTimeDeliveryRate || "",
    insurance: {
      policyNumber: c.insurance?.policyNumber || "",
      coverageAmount: c.insurance?.coverageAmount || "",
      expiryDate: c.insurance?.expiryDate || "",
      isCompliant: c.insurance?.isCompliant !== false,
    },
    status: c.status || "Active",
    notes: c.notes || "",
  };
}
