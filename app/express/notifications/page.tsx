"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, RefreshCw, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface ExpressNotification {
  id: string;
  title: string;
  titleFr: string;
  desc: string;
  descFr: string;
  time: string;
  dateTime: string;
  link: string;
  unread: boolean;
}

export default function ExpressNotificationsPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const n = t.express.notif;
  const [items, setItems] = useState<ExpressNotification[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/notifications?scope=express");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error("load");
      setItems(data.notifications);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unread = items ? items.filter((i) => i.unread).length : 0;
  const visible = (items ?? []).filter((i) => filter === "all" || i.unread);

  const open = (item: ExpressNotification) => {
    if (item.unread) {
      setItems((prev) => prev && prev.map((i) => (i.id === item.id ? { ...i, unread: false } : i)));
      fetch(`/api/notifications/${item.id}`, { method: "PATCH" }).catch(() => {});
    }
    if (item.link) router.push(item.link);
  };

  const markAll = () => {
    setItems((prev) => prev && prev.map((i) => ({ ...i, unread: false })));
    fetch("/api/notifications?scope=express", { method: "PATCH" }).catch(() => {});
  };

  const remove = (id: string) => {
    setItems((prev) => prev && prev.filter((i) => i.id !== id));
    fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">{n.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{n.pageSubtitle}</p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAll} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
            <CheckCheck className="h-4 w-4" />
            {n.markAll}
          </button>
        )}
      </div>

      <div className="flex gap-1.5" role="tablist">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${filter === f ? "border-[#0B2545] bg-[#0B2545] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {f === "all" ? n.filterAll : n.filterUnread} <span className="opacity-60">{f === "all" ? items?.length ?? 0 : unread}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-red-600">{t.express.loadError}</p>
          <button type="button" onClick={load} className="cursor-pointer rounded-xl bg-[#0B2545] px-4 py-2 text-xs font-bold text-white">
            {t.express.retry}
          </button>
        </div>
      ) : items === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {t.express.loading}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <Bell className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">{n.empty}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {visible.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-slate-50">
              <button type="button" onClick={() => open(item)} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left">
                <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${item.unread ? "bg-[#D21F27]" : "bg-transparent"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${item.unread ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>{language === "fr" ? item.titleFr : item.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{language === "fr" ? item.descFr : item.desc}</span>
                  <span className="mt-1 block text-[11px] text-slate-400">
                    {item.time} · {item.dateTime}
                  </span>
                </span>
              </button>
              <button type="button" onClick={() => remove(item.id)} aria-label={n.remove} title={n.remove} className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
