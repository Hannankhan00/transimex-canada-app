"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import PortalSidebar from "./PortalSidebar";
import TopBar from "./TopBar";

interface PortalShellProps {
  children: React.ReactNode;
}

export default function PortalShell({ children }: PortalShellProps) {
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

    async function loadUser() {
      try {
        const { user: currentUser } = await api.auth.me();
        if (isMounted) {
          if (currentUser) {
            setUser(currentUser);
          } else {
            // Check local fallback
            const stored = localStorage.getItem("transimex_user");
            if (stored) {
              setUser(JSON.parse(stored));
            }
          }
        }
      } catch (err) {
        console.error("Portal shell auth check error:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex text-[#111c2d] antialiased selection:bg-[#d21f27] selection:text-white">
      {/* 260px Fixed Desktop Sidebar & Mobile Drawer */}
      <PortalSidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        unreadCount={3}
        userRole={user?.role || "client"}
      />

      {/* Main Column (Offset by 260px on Desktop) */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-[260px] transition-all">
        {/* Top Profile Bar */}
        <TopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          user={user}
          unreadCount={3}
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
