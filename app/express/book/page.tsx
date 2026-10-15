"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useExpressAccount } from "@/components/express/useExpressAccount";
import BookingWizard from "@/components/express/BookingWizard";

/** Booking area. Only active accounts get in; everyone else goes back to the overview. */
export default function ExpressBookPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { account, loading } = useExpressAccount();

  const allowed = account?.status === "active";

  useEffect(() => {
    if (!loading && !allowed) router.replace("/express");
  }, [loading, allowed, router]);

  if (loading || !allowed || !account) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {t.express.loading}
      </div>
    );
  }

  return <BookingWizard account={account} />;
}
