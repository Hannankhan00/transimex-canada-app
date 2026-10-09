"use client";

import React, { useMemo, useState } from "react";
import { Anchor, ArrowRight, Calendar, ExternalLink, Ship, Sparkles, ShieldCheck, X } from "lucide-react";
import TransimexLogo from "@/components/TransimexLogo";
import { buildPublicPromotion, PromoLang, PromotionDTO } from "@/lib/promotionTypes";

interface PromotionPopupPreviewProps {
  promotion: PromotionDTO;
  lang: PromoLang;
  /** Forces the text version, as the website shows when the image fails to load. */
  forceText?: boolean;
  onClose?: () => void;
}

/** Hides itself if a flag file is missing; flags are optional and must never break the popup. */
function Flag({ src, className = "" }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={22}
      height={16}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`h-[15px] w-5 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.12)] flex-shrink-0 ${className}`}
    />
  );
}

/**
 * Reference rendering of the popup, built from the same `buildPublicPromotion` output the
 * public API returns. The website's own popup follows this behaviour:
 * image first, automatic text fallback if the image is missing or fails to load.
 */
export default function PromotionPopupPreview({
  promotion,
  lang,
  forceText = false,
  onClose,
}: PromotionPopupPreviewProps) {
  const view = useMemo(() => buildPublicPromotion(promotion, lang, ""), [promotion, lang]);
  const imageUrl = view.image?.url ?? null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const showImage = !!imageUrl && !forceText && failedUrl !== imageUrl;
  const places = [
    ...(view.destination.city || view.destination.countryCode
      ? [
          {
            ...view.destination,
            label: view.destination.city || view.destination.countryName || "",
            isPrimary: true,
          },
        ]
      : []),
    ...view.ports.map((p) => ({ ...p, isPrimary: false })),
  ].filter((p) => p.label);

  const closeButton = onClose && (
    <button
      type="button"
      onClick={onClose}
      aria-label={lang === "fr" ? "Fermer" : "Close"}
      className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs"
    >
      <X className="w-4 h-4" />
    </button>
  );

  if (showImage) {
    return (
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-white shadow-2xl ring-1 ring-black/5">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === "fr" ? "Fermer" : "Close"}
            className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white border border-white/20 shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <a
          href={view.cta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block overflow-hidden"
          aria-label={view.cta.label || view.title}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl!}
            alt={view.imageAlt}
            width={view.image!.width}
            height={view.image!.height}
            decoding="async"
            onError={() => setFailedUrl(imageUrl)}
            className="block w-full h-auto max-h-[80vh] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide flex items-center gap-1.5">
              <span>{view.cta.label || (lang === "fr" ? "Voir l'offre" : "View Offer")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-white/80" />
          </div>
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5 overflow-hidden text-center">
      {/* Decorative Brand Top Stripe */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0B2545] via-[#D21F27] to-[#0B2545]" />

      <div className="px-6 sm:px-10 pt-7 pb-6 relative">
        {closeButton}

        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center gap-2">
          <TransimexLogo size="sm" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[10.5px] font-bold text-[#0B2545] tracking-wider uppercase">
            <Ship className="w-3 h-3 text-[#D21F27]" />
            <span>{lang === "fr" ? "Transport Maritime & Fret International" : "International Ocean Freight"}</span>
          </div>
        </div>

        {/* Highlight Badge */}
        {view.badge && (
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10 border border-red-200/90 text-[#D21F27] text-xs font-extrabold tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#D21F27] animate-pulse" />
            <span>{view.badge}</span>
          </div>
        )}

        {/* Departure Date Callout */}
        {view.departureDateFormatted && (
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-50/90 border border-blue-100/80 text-xs font-semibold text-[#0B2545] shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#D21F27]" />
            <span>
              {lang === "fr" ? "Date de départ :" : "Departure Date:"}{" "}
              <strong className="font-bold text-[#0B2545]">{view.departureDateFormatted}</strong>
            </span>
          </div>
        )}

        {/* Headline */}
        <h3 className="mt-4 text-2xl sm:text-3xl font-black text-[#0B2545] tracking-tight leading-tight flex items-center justify-center gap-2.5 flex-wrap">
          <span>{view.title}</span>
          {view.showFlags && view.destination.flagUrl && (
            <Flag src={view.destination.flagUrl} className="!h-[18px] !w-6 shadow-xs rounded-[2px]" />
          )}
        </h3>

        {/* Description */}
        {view.description && (
          <p className="mt-2.5 text-sm sm:text-[15px] text-slate-600 leading-relaxed whitespace-pre-line max-w-lg mx-auto font-normal">
            {view.description}
          </p>
        )}

        {/* Route / Ports of Call Itinerary */}
        {places.length > 0 && (
          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/60 p-3.5 sm:p-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-center gap-1.5">
              <Anchor className="w-3 h-3 text-[#D21F27]" />
              <span>{lang === "fr" ? "Itinéraire & Ports Desservis" : "Route & Ports of Call"}</span>
            </div>
            <ul className="flex flex-wrap items-center justify-center gap-2">
              {/* Origin Tag */}
              <li className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200/90 text-[11px] font-bold text-slate-700 shadow-2xs">
                <span className="text-xs">🇨🇦</span>
                <span>Canada</span>
              </li>
              <span className="text-slate-300 font-bold">→</span>
              {/* Destination & Ports */}
              {places.map((p, i) => (
                <li
                  key={`${p.label}-${i}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wide transition shadow-2xs ${
                    p.isPrimary
                      ? "bg-[#0B2545] text-white border border-[#0B2545]"
                      : "bg-white text-[#0B2545] border border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  <Flag src={p.flagUrl} />
                  <span>{p.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA Button */}
        <div className="mt-6 flex justify-center">
          <a
            href={view.cta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D21F27] to-[#B0141B] hover:from-[#B0141B] hover:to-[#900E14] px-8 sm:px-10 py-3 sm:py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-red-600/25 hover:shadow-xl hover:shadow-red-600/35 transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <span>{view.cta.label}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* Trust Footer */}
        <div className="mt-5 border-t border-slate-100 pt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>
            {view.footer ||
              (lang === "fr"
                ? "Transport fiable. Service professionnel. Partout en Afrique."
                : "Reliable shipping. Professional service. Across Africa.")}
          </span>
        </div>
      </div>
    </div>
  );
}
