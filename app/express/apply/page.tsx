"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useExpressAccount } from "@/components/express/useExpressAccount";
import ExpressApplicationForm from "@/components/express/ExpressApplicationForm";

export default function ExpressApplyPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { account, loading } = useExpressAccount();

  // One application per user: anyone who already applied goes back to the overview.
  useEffect(() => {
    if (!loading && account) router.replace("/express");
  }, [loading, account, router]);

  if (loading || account) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {t.express.loading}
      </div>
    );
  }

  return <ExpressApplicationForm />;
}
