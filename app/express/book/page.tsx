"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useExpressAccount } from "@/components/express/useExpressAccount";

/** Booking area. Only active accounts reach it; the booking form itself arrives in a later phase. */
export default function ExpressBookPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { account, loading } = useExpressAccount();

  const allowed = account?.status === "active";

  useEffect(() => {
    if (!loading && !allowed) router.replace("/express");
  }, [loading, allowed, router]);

  if (loading || !allowed) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {t.express.loading}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-[#0B2545]">{t.express.book.title}</h1>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#0B2545]/5 flex items-center justify-center">
          <Package className="w-6 h-6 text-[#0B2545]" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#0B2545]">{t.express.book.comingTitle}</h2>
        <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">{t.express.book.comingBody}</p>
      </div>
    </div>
  );
}
