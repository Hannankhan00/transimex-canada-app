"use client";

import React, { useMemo, useState } from "react";
import { Megaphone, X } from "lucide-react";
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
      width={20}
      height={15}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`h-[15px] w-5 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.12)] flex-shrink-0 ${className}`}
    />
  );
}

/**
 * Reference rendering of the popup, built from the same `buildPublicPromotion` output the
 * public API returns. The website's own popup should follow this behaviour:
 * image first, automatic text fallback if the image is missing or fails to load.
 */
export default function PromotionPopupPreview({ promotion, lang, forceText = false, onClose }: PromotionPopupPreviewProps) {
  const view = useMemo(() => buildPublicPromotion(promotion, lang, ""), [promotion, lang]);
  const imageUrl = view.image?.url ?? null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const showImage = !!imageUrl && !forceText && failedUrl !== imageUrl;
  const places = [
    ...(view.destination.city || view.destination.countryCode ? [{ ...view.destination, label: view.destination.city || view.destination.countryName || "" }] : []),
    ...view.ports,
  ].filter((p) => p.label);

  const closeButton = onClose && (
    <button
      type="button"
      onClick={onClose}
      aria-label={lang === "fr" ? "Fermer" : "Close"}
      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/95 text-slate-700 hover:bg-white shadow-md flex items-center justify-center cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  );

  if (showImage) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden bg-white shadow-2xl">
        {closeButton}
        <a href={view.cta.url} target="_blank" rel="noopener noreferrer" className="block" aria-label={view.cta.label || view.title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl!}
            alt={view.imageAlt}
            width={view.image!.width}
            height={view.image!.height}
            decoding="async"
            onError={() => setFailedUrl(imageUrl)}
            className="block w-full h-auto"
          />
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl bg-white shadow-2xl px-5 sm:px-8 pt-6 pb-5 text-center">
      {closeButton}
      <div className="flex justify-center">
        <TransimexLogo size="sm" />
      </div>

      <div className="mt-3 mx-auto w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
        <Megaphone className="w-5 h-5 text-[#D21F27]" />
      </div>

      <h3 className="mt-3 text-xl sm:text-2xl font-extrabold text-[#0B2545] leading-tight flex items-center justify-center gap-2 flex-wrap">
        <span>{view.title}</span>
        {view.showFlags && <Flag src={view.destination.flagUrl} className="!h-[18px] !w-6" />}
      </h3>

      {view.description && <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{view.description}</p>}
      {view.badge && <p className="mt-2 text-sm font-bold text-[#D21F27]">{view.badge}</p>}

      {places.length > 0 && (
        <ul className="mt-4 flex flex-wrap justify-center gap-x-1 gap-y-2 rounded-xl bg-slate-50 px-3 py-3">
          {places.map((p, i) => (
            <li
              key={`${p.label}-${i}`}
              className="flex items-center gap-1.5 px-3 text-[11px] font-bold uppercase tracking-wide text-[#0B2545] sm:border-r sm:border-[#D21F27]/60 last:border-r-0"
            >
              <Flag src={p.flagUrl} />
              <span>{p.label}</span>
            </li>
          ))}
        </ul>
      )}

      <a
        href={view.cta.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#D21F27] hover:bg-[#ab0015] px-8 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition"
      >
        {view.cta.label} →
      </a>

      {view.footer && <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">{view.footer}</p>}
    </div>
  );
}
