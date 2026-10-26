"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import ExpressSidebar, { type ExpressUser } from "./ExpressSidebar";
import ExpressTopBar from "./ExpressTopBar";
import { ExpressAccountProvider, useExpressAccount } from "./useExpressAccount";

interface ExpressShellProps {
  children: React.ReactNode;
  userName?: string;
}

export default function ExpressShell({ children, userName }: ExpressShellProps) {
  const pathname = usePathname();
  return (
    <ExpressAccountProvider>
      <ShellFrame userName={userName}>{children}</ShellFrame>
    </ExpressAccountProvider>
  );
}

function ShellFrame({ children, userName }: ExpressShellProps) {
  const router = useRouter();
  const { account } = useExpressAccount();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<ExpressUser | null>(null);

  // The CRM profile adds the company name; the signed-in name is already known from the server.
  useEffect(() => {
    let alive = true;
    api.auth
      .me()
      .then(({ user: u }) => {
        if (alive && u) setUser({ name: u.name, companyName: u.companyName, email: u.email });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Close the phone menu on navigation, and with the Escape key.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const logout = async () => {
    await api.auth.logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fa] text-[#111c2d] antialiased">
      <ExpressSidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} user={user} fallbackName={userName} onLogout={logout} accountStatus={account?.status ?? null} isPartner={Boolean(account?.partner)} isCustomer={account?.type === "customer"} hasInvoices={account?.type === "b2b" && Boolean(account.billingModes?.includes("invoice"))} />
      <div className="flex min-w-0 flex-1 flex-col md:pl-[260px]">
        <ExpressTopBar onOpenMenu={() => setMenuOpen(true)} userName={user?.name || userName} />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-[1480px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
