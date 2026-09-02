"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    name?: string;
    email?: string;
    companyName?: string;
    role?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifyStaffSession() {
      try {
        const { user: currentUser } = await api.auth.me();
        if (isMounted) {
          if (currentUser) {
            const role = currentUser.role;
            if (role === "client" || role === "user") {
              // Redirect unauthorized clients to their portal
              router.push("/dashboard");
              return;
            }
            setUser(currentUser);
          } else {
            // Check local fallback
            const stored = localStorage.getItem("transimex_user");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.role === "client" || parsed.role === "user") {
                router.push("/dashboard");
                return;
              }
              setUser(parsed);
            } else {
              router.push("/login?from=/admin");
              return;
            }
          }
        }
      } catch (err) {
        console.error("Admin shell auth verification error:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verifyStaffSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex text-[#111c2d] antialiased selection:bg-[#d21f27] selection:text-white">
      {/* 260px Fixed Desktop Sidebar & Mobile Drawer */}
      <AdminSidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        userRole={user?.role || "admin"}
      />

      {/* Main Column (Offset by 260px on Desktop) */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-[260px] transition-all">
        {/* Top Header Bar */}
        <AdminTopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          user={user}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
