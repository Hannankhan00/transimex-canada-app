"use client";

import React from "react";
import { AlertTriangle, Ban, Clock, XCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { ClientAccountDTO } from "@/lib/express/accountDto";

/** Banner for pending, rejected and suspended accounts. Renders nothing for active ones. */
export default function ExpressStatusBanner({ account }: { account: ClientAccountDTO }) {
  const { t } = useLanguage();
  const o = t.express.overview;

  const config = {
    pending: { icon: Clock, title: o.pendingTitle, body: o.pendingBody, style: "bg-amber-50 border-amber-200 text-amber-900", iconStyle: "text-amber-600", reason: "" },
    rejected: { icon: XCircle, title: o.rejectedTitle, body: o.rejectedBody, style: "bg-red-50 border-red-200 text-red-900", iconStyle: "text-red-600", reason: account.rejectionReason },
    suspended: { icon: Ban, title: o.suspendedTitle, body: o.suspendedBody, style: "bg-red-50 border-red-200 text-red-900", iconStyle: "text-red-600", reason: account.suspensionReason },
  } as const;

  if (account.status === "active") return null;
  const c = config[account.status];
  const Icon = c.icon ?? AlertTriangle;

  return (
    <div role="status" className={`rounded-2xl border p-5 flex gap-4 ${c.style}`}>
      <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${c.iconStyle}`} />
      <div className="space-y-1.5">
        <h2 className="font-bold">{c.title}</h2>
        <p className="text-sm leading-relaxed">{c.body}</p>
        {c.reason && (
          <p className="text-sm">
            <span className="font-bold">{o.reason}:</span> {c.reason}
          </p>
        )}
      </div>
    </div>
  );
}
