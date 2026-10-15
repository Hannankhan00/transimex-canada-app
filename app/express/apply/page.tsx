"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useExpressAccount } from "@/components/express/useExpressAccount";

/**
 * The application is a popup in the client portal now. This address stays so old links keep
 * working: it sends people with no account to the popup, and everyone else to their overview.
 */
export default function ExpressApplyPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { account, loading } = useExpressAccount();

  useEffect(() => {
    if (loading) return;
    router.replace(account ? "/express" : "/dashboard?express=apply");
  }, [loading, account, router]);

  return (
    <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
      <RefreshCw className="w-4 h-4 animate-spin" />
      {t.express.loading}
    </div>
  );
}
