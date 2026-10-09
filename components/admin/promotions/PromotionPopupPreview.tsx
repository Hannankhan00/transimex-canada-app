"use client";

import React, { useMemo, useState } from "react";
import { Calendar, MapPin, Megaphone, X } from "lucide-react";
import TransimexLogo from "@/components/TransimexLogo";
import { buildPublicPromotion, PromoLang, PromotionDTO } from "@/lib/promotionTypes";

interface PromotionPopupPreviewProps {
  promotion: PromotionDTO;
  lang: PromoLang;
  /** Forces the text fallback version, matching the website's fallback behaviour. */
  forceText?: boolean;
  onClose?: () => void;
}

/** Flag helper that fails silently without breaking layout */
function FlagImage({
  src,
  className = "",
  isCircle = false,
}: {
  src: string | null | undefined;
  className?: string;
  isCircle?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    if (isCircle) {
      return (
        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white/80 flex items-center justify-center text-[10px] text-slate-500 font-bold">
          📍
        </div>
      );
    }
    return null;
  }

  if (isCircle) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/90 shadow-md bg-white flex items-center justify-center flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={26}
      height={18}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`h-5 w-7 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.15)] inline-block flex-shrink-0 ${className}`}
    />
  );
}

/**
 * Pixel-accurate reference rendering of the promotion popup matching Transimex design specs:
 * 1. Image Popup (Normal) — Header with plane/ship hero graphic, route details, urgency badge, and navy ports bar with circular flags.
 * 2. Text Fallback Popup — Clean centered card with logo, megaphone, highlighted date, 2-row port grid, and red CTA button.
 */
export default function PromotionPopupPreview({
  promotion,
  lang,
  forceText = false,
  onClose,
}: PromotionPopupPreviewProps) {
  const view = useMemo(() => buildPublicPromotion(promotion, lang, ""), [promotion, lang]);

  // Fallback defaults matching mockup if fields are empty
  const isFr = lang === "fr";
  const cityName = view.destination.city?.trim() || "Douala";
  const countryName = view.destination.countryName?.trim() || (isFr ? "Cameroun" : "Cameroon");
  const departureDate =
    view.departureDateFormatted || (isFr ? "16 octobre 2026" : "October 16, 2026");
  const destinationText = `${cityName}, ${countryName}`;
  const badgeText =
    view.badge?.trim() || (isFr ? "DERNIÈRES PLACES DISPONIBLES !" : "LAST SPACES AVAILABLE !");
  const ctaLabel = view.cta.label?.trim() || (isFr ? "OBTENIR UN DEVIS" : "GET A QUOTE");
  const footerText =
    view.footer?.trim() ||
    (isFr
      ? "Transport fiable. Service professionnel. Partout en Afrique."
      : "Reliable transport. Professional service. Across Africa.");

  // Resolve list of ports. If none provided, provide representative ports from mockup
  const defaultSamplePorts = [
    { label: "DOUALA", flagUrl: "/flags/cm.svg" },
    { label: "MATADI", flagUrl: "/flags/cd.svg" },
    { label: "TEMA", flagUrl: "/flags/gh.svg" },
    { label: "DAKAR", flagUrl: "/flags/sn.svg" },
    { label: "ABIDJAN", flagUrl: "/flags/ci.svg" },
    { label: "TUNISIA", flagUrl: "/flags/tn.svg" },
  ];

  const configuredPorts = [
    ...(view.destination.city || view.destination.countryCode
      ? [
          {
            label: (view.destination.city || view.destination.countryName || "DOUALA").toUpperCase(),
            flagUrl: view.destination.flagUrl || "/flags/cm.svg",
          },
        ]
      : []),
    ...view.ports.map((p) => ({
      label: p.label.toUpperCase(),
      flagUrl: p.flagUrl,
    })),
  ].filter((p) => p.label);

  const displayPorts = configuredPorts.length >= 2 ? configuredPorts : defaultSamplePorts;

  // Visual image graphic for image mode
  const visualSrc = view.image?.url || "/freight-hero.webp";

  // Common close button
  const closeBtn = onClose && (
    <button
      type="button"
      onClick={onClose}
      aria-label={isFr ? "Fermer" : "Close"}
      className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-black border border-slate-200/80 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  );

  // -------------------------------------------------------------
  // VARIANT 1 & 3: Normal Image Popup (Matches Quadrants 1 & 3)
  // -------------------------------------------------------------
  if (!forceText) {
    return (
      <div className="relative w-full rounded-2xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden ring-1 ring-slate-900/10 text-left">
        {closeBtn}

        {/* Top White / Hero Visual Section */}
        <div className="relative bg-white pt-5 pb-5 px-5 sm:px-7 overflow-hidden">
          {/* Logo */}
          <div className="mb-3">
            <TransimexLogo size="sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Left Content Column */}
            <div className="md:col-span-7 z-10 space-y-3">
              {/* Kicker + City + Flag */}
              <div>
                <p className="text-base sm:text-lg font-black text-[#0B2545] tracking-tight uppercase leading-none">
                  {isFr ? "PROCHAIN CHARGEMENT –" : "NEXT SHIPMENT TO"}
                </p>
                <div className="flex items-center gap-2.5 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-[#D21F27] tracking-tight uppercase leading-none">
                    {cityName}
                  </span>
                  <FlagImage src={view.destination.flagUrl || "/flags/cm.svg"} />
                </div>
              </div>

              {/* Departure & Destination Row */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Departure Box */}
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-md bg-red-50 text-[#D21F27] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] leading-tight">
                    <span className="text-slate-500 font-medium block">
                      {isFr ? "Départ :" : "Departure:"}
                    </span>
                    <strong className="text-slate-900 font-extrabold text-xs block mt-0.5">
                      {departureDate}
                    </strong>
                  </div>
                </div>

                {/* Destination Box */}
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-md bg-red-50 text-[#D21F27] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] leading-tight">
                    <span className="text-slate-500 font-medium block">
                      {isFr ? "Destination :" : "Destination :"}
                    </span>
                    <strong className="text-slate-900 font-extrabold text-xs block mt-0.5 truncate max-w-[140px]">
                      {destinationText}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Urgency Ribbon */}
              <div className="inline-flex items-center gap-2 rounded-lg bg-[#D21F27] px-3.5 py-1.5 text-white shadow-xs">
                <Megaphone className="w-3.5 h-3.5 fill-white" />
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider">
                  {badgeText}
                </span>
              </div>
            </div>

            {/* Right Cargo Ship & Airplane Graphic */}
            <div className="md:col-span-5 relative flex justify-center items-center">
              <div className="relative w-full max-w-[280px] md:max-w-none h-44 sm:h-52 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={visualSrc}
                  alt={view.imageAlt || cityName}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Dark Navy Section */}
        <div className="bg-[#0B2545] px-5 sm:px-8 py-5 text-center text-white space-y-4">
          {/* Circular Flags Row with Separators */}
          <div className="flex flex-wrap items-center justify-center gap-y-3">
            {displayPorts.map((port, idx) => (
              <React.Fragment key={`${port.label}-${idx}`}>
                <div className="flex flex-col items-center gap-1.5 px-2.5 sm:px-3">
                  <FlagImage src={port.flagUrl} isCircle />
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white">
                    {port.label}
                  </span>
                </div>
                {idx < displayPorts.length - 1 && (
                  <span className="text-slate-400 font-light text-sm select-none hidden sm:inline-block">
                    |
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Solid Red CTA Button */}
          <div className="pt-1">
            <a
              href={view.cta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-10 py-2.5 rounded-lg bg-[#D21F27] hover:bg-[#B0141B] text-white text-xs font-black uppercase tracking-wider shadow-lg transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              {ctaLabel} →
            </a>
          </div>

          {/* Footer Text */}
          <p className="text-[10.5px] text-slate-300 font-medium tracking-wide">
            {footerText}
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VARIANT 2 & 4: Text Fallback Popup (Matches Quadrants 2 & 4)
  // -------------------------------------------------------------
  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl bg-white shadow-2xl p-6 sm:p-8 text-center ring-1 ring-slate-900/10">
      {closeBtn}

      {/* Centered Logo */}
      <div className="flex justify-center mb-4">
        <TransimexLogo size="sm" />
      </div>

      {/* Centered Megaphone Icon */}
      <div className="w-10 h-10 rounded-full bg-red-50 text-[#D21F27] flex items-center justify-center mx-auto mb-3">
        <Megaphone className="w-5 h-5 fill-current" />
      </div>

      {/* Title with Flag */}
      <h3 className="text-xl sm:text-2xl font-black text-[#0B2545] tracking-tight leading-snug flex items-center justify-center gap-2 flex-wrap">
        <span>
          {isFr ? `Prochain Chargement – ${cityName}` : `Next Shipment to ${cityName}`}
        </span>
        <FlagImage src={view.destination.flagUrl || "/flags/cm.svg"} />
      </h3>

      {/* Departure description with red highlighted date */}
      <p className="mt-2 text-xs sm:text-sm text-slate-600 font-medium">
        {isFr ? (
          <>
            Départ le <strong className="text-[#D21F27] font-bold">{departureDate}</strong> vers{" "}
            {destinationText}.
          </>
        ) : (
          <>
            Departure on <strong className="text-[#D21F27] font-bold">{departureDate}</strong> to{" "}
            {destinationText}.
          </>
        )}
      </p>

      {/* Urgency Badge in Bold Red */}
      <p className="mt-2 text-xs sm:text-sm font-black text-[#D21F27] uppercase tracking-wide">
        {badgeText}
      </p>

      {/* Clean 2-Row Port Grid Container */}
      <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200/80 p-3 sm:p-4 max-w-md mx-auto">
        <div className="grid grid-cols-3 gap-y-3.5 text-center items-center">
          {displayPorts.slice(0, 6).map((port, idx) => {
            const isMiddle = idx % 3 === 1;
            return (
              <div
                key={`${port.label}-${idx}`}
                className={`flex items-center justify-center px-2 ${
                  isMiddle ? "border-x border-slate-200" : ""
                }`}
              >
                <span className="text-[11px] sm:text-xs font-black uppercase text-[#0B2545] tracking-wider">
                  {port.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Solid Red CTA Button */}
      <div className="mt-5">
        <a
          href={view.cta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-10 py-3 rounded-lg bg-[#D21F27] hover:bg-[#B0141B] text-white text-xs font-black uppercase tracking-wider shadow-md transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          {ctaLabel} →
        </a>
      </div>

      {/* Footer Line */}
      <p className="mt-4 text-[11px] text-slate-500 font-medium">
        {footerText}
      </p>
    </div>
  );
}
