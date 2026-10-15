"use client";

import { Plane } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ExpressOverviewPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B2545]">{t.express.overviewTitle}</h1>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">{t.express.overviewIntro}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#0B2545]/5 flex items-center justify-center">
          <Plane className="w-6 h-6 text-[#0B2545]" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#0B2545]">{t.express.comingTitle}</h2>
        <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">{t.express.comingBody}</p>
      </div>
    </div>
  );
}
