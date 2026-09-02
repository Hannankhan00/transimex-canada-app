import { z } from "zod";

export const addressSchema = z.object({
  alias: z
    .string()
    .min(2, "Alias / Facility name must be at least 2 characters")
    .max(50, "Alias must be under 50 characters"),
  company: z
    .string()
    .min(2, "Company name is required")
    .max(100, "Company name is too long"),
  contactPerson: z
    .string()
    .min(2, "Contact person name is required")
    .max(60, "Contact name is too long"),
  phone: z
    .string()
    .min(7, "Please enter a valid phone number")
    .regex(/^[\d\s+\-().]+$/, "Invalid phone format"),
  street: z
    .string()
    .min(5, "Street address must be at least 5 characters")
    .max(150, "Street address is too long"),
  city: z
    .string()
    .min(2, "City is required")
    .max(60, "City name is too long"),
  province: z
    .string()
    .min(2, "Please select or enter a province / state"),
  postalCode: z
    .string()
    .min(3, "Postal / ZIP code is required")
    .max(12, "Postal code is too long"),
  country: z
    .string(),
  accessInstructions: z
    .string()
    .max(300, "Instructions must be under 300 characters")
    .optional(),
  isDefault: z
    .boolean(),
});

export type AddressFormData = z.infer<typeof addressSchema>;

export interface SavedAddress extends AddressFormData {
  id: string;
  createdAt: string;
}
