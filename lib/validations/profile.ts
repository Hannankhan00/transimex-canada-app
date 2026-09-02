import { z } from "zod";

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long"),
  phone: z
    .string()
    .min(7, "Please enter a valid phone number")
    .regex(/^[\d\s+\-().]+$/, "Invalid phone format"),
  jobTitle: z
    .string()
    .max(80, "Job title is too long")
    .optional(),
  department: z
    .string()
    .max(80, "Department is too long")
    .optional(),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
