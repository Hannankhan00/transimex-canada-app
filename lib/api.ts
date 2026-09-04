/**
 * Transimex Canada Client Portal API Layer
 * Connects frontend flows with Next.js API routes with robust mock fallbacks.
 */

import { RegisterFormData, LoginFormData, ForgotPasswordFormData, ResetPasswordFormData } from "./validations/auth";

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    userId: string;
    name: string;
    email: string;
    companyName: string;
    role: string;
    phone?: string;
    address?: string;
    industry?: string;
    city?: string;
    province?: string;
  };
  error?: string;
}

export const api = {
  auth: {
    async register(data: RegisterFormData): Promise<AuthResponse> {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Registration failed");
      }
      return result;
    },

    async login(data: LoginFormData): Promise<AuthResponse> {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        const err: any = new Error(result.error || "Invalid corporate email or password");
        err.code = result.code;
        throw err;
      }
      return result;
    },

    async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to resend verification email");
      }
      return result;
    },

    async forgotPassword(data: ForgotPasswordFormData): Promise<{ success: boolean; message: string }> {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to process password reset request");
      }
      return result;
    },

    async resetPassword(token: string, data: ResetPasswordFormData): Promise<{ success: boolean; message: string }> {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to reset password");
      }
      return result;
    },

    async me(): Promise<{ user: AuthResponse["user"] | null }> {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            if (typeof window !== "undefined") {
              localStorage.setItem("transimex_user", JSON.stringify(data.user));
            }
            return { user: data.user };
          }
        }
      } catch {
        // Network or fetch error
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("transimex_user");
      }
      return { user: null };
    },

    async logout(): Promise<void> {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Ignore network errors on logout
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("transimex_user");
        document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
        document.cookie = "next-auth.session-token=; path=/; max-age=0; SameSite=Lax";
      }
    },
  },
};
