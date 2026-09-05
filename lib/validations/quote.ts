import { z } from "zod";

export const transportModesEnum = [
  // Truck
  "53' Dry Van",
  "Refrigerated Reefer",
  "Flatbed / Heavy Haul",
  "Lowboy / RGN Heavy Haul",
  "Cross-Border LTL",
  // Ship
  "20ft Container FCL",
  "40ft Container FCL",
  "40ft High Cube FCL",
  "Ocean LCL Groupage",
  "Break Bulk / Heavy Lift",
  "RoRo Vehicles & Machinery",
  // Plane
  "Air Freight Expedited",
  "Air Freight Standard",
  "Air Charter",
  "Courier / Small Parcel",
  // Rail
  "Intermodal Rail",
  "Rail Boxcar",
  "Rail Flatcar Heavy Haul",
] as const;

export type TransportModeType = (typeof transportModesEnum)[number];

export const quoteRequestSchema = z.object({
  originCity: z
    .string()
    .min(2, "Origin city is required"),
  originProvince: z
    .string()
    .min(2, "Origin province/state is required"),
  originPostal: z
    .string()
    .min(3, "Origin postal/ZIP code is required"),
  destinationCity: z
    .string()
    .min(2, "Destination city is required"),
  destinationProvince: z
    .string()
    .min(2, "Destination province/state is required"),
  destinationPostal: z
    .string()
    .min(3, "Destination postal/ZIP code is required"),
  transportMode: z.enum(transportModesEnum),
  weightLbs: z
    .string()
    .min(1, "Weight is required")
    .regex(/^[\d,]+$/, "Enter numeric weight in lbs"),
  palletCount: z
    .string()
    .optional(),
  pickupDate: z
    .string()
    .min(1, "Pickup date is required"),
  dimLengthIn: z
    .string()
    .min(1, "Length is required")
    .regex(/^\d+(\.\d+)?$/, "Enter numeric length in inches"),
  dimWidthIn: z
    .string()
    .min(1, "Width is required")
    .regex(/^\d+(\.\d+)?$/, "Enter numeric width in inches"),
  dimHeightIn: z
    .string()
    .min(1, "Height is required")
    .regex(/^\d+(\.\d+)?$/, "Enter numeric height in inches"),
  commodityType: z
    .string()
    .min(2, "Commodity / Cargo description is required"),
  temperatureControlled: z
    .boolean(),
  hazmat: z
    .boolean(),
  specialInstructions: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional(),
  contactName: z
    .string()
    .min(2, "Contact name is required"),
  contactEmail: z
    .string()
    .email("Valid email is required"),
  contactPhone: z
    .string()
    .min(7, "Phone number is required"),
  companyName: z
    .string()
    .optional(),
});

export type QuoteRequestFormData = z.infer<typeof quoteRequestSchema>;
