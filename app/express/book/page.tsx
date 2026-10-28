"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useExpressAccount } from "@/components/express/useExpressAccount";
import ExpressStatusBanner from "@/components/express/ExpressStatusBanner";
import BookingWizard from "@/components/express/BookingWizard";
import CustomerQuote from "@/components/express/CustomerQuote";

/**
 * Booking area. Only an active account can book. A business account still waiting for
 * approval can look around, but sees this locked page instead of the booking form.
 */
export default function ExpressBookPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { account, loading } = useExpressAccount();
  const b = t.express.book;

  // No Express account yet: the application popup in the client portal is the way in.
  useEffect(() => {
    if (!loading && !account) router.replace("/dashboard?express=apply");
  }, [loading, account, router]);

  if (loading || !account) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {t.express.loading}
      </div>
    );
  }

  if (account.status !== "active") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-[#0B2545]">{b.title}</h1>
        <ExpressStatusBanner account={account} />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100">
            <Lock className="h-6 w-6 text-slate-500" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#0B2545]">{b.lockedTitle}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{b.lockedBody}</p>
          <Link href="/express" className="mt-5 inline-block rounded-xl bg-[#0B2545] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#12315c]">
            {b.lockedBack}
          </Link>
        </div>
      </div>
    );
  }

  // A partner's customer can book once their partner has connected Stripe; until then they only check prices.
  if (account.type === "customer" && !account.customerCanBook) return <CustomerQuote />;

  return <BookingWizard account={account} />;
}
