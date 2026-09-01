import { z } from "zod";

export const provincesEnum = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"
] as const;

export const industriesEnum = [
  "Automotive",
  "Manufacturing",
  "Pharma",
  "Retail",
  "Food",
  "Industrial",
  "Other",
] as const;

export type IndustryType = (typeof industriesEnum)[number];
export type ProvinceType = (typeof provincesEnum)[number];

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long"),
  email: z
    .string()
    .min(1, "Corporate email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z
    .string()
    .min(7, "Please enter a valid phone number")
    .max(20, "Phone number is too long"),
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(120, "Company name is too long"),
  industry: z.enum(industriesEnum, {
    errorMap: () => ({ message: "Please select an industry type" }),
  }),
  city: z
    .string()
    .min(2, "City name must be at least 2 characters"),
  province: z.enum(provincesEnum, {
    errorMap: () => ({ message: "Please select a Canadian province/territory" }),
  }),
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Terms of Service & Privacy Policy" }),
  }),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
  rememberMe: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Registered corporate email is required")
    .email("Please enter a valid email address"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
