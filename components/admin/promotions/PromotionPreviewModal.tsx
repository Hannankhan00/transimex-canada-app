"use client";

import React, { useEffect, useState } from "react";
import { Clock, Globe, Image as ImageIcon, Monitor, Smartphone, Type, X, Edit3 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PromoLang, PromotionDTO } from "@/lib/promotionTypes";
import PromotionPopupPreview from "./PromotionPopupPreview";

interface PromotionPreviewModalProps {
  promotion: PromotionDTO | null;
  onClose: () => void;
  onEdit?: (promotion: PromotionDTO) => void;
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/80">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
            value === o.value
              ? "bg-white text-[#0B2545] shadow-xs"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function PromotionPreviewModal({ promotion, onClose, onEdit }: PromotionPreviewModalProps) {
  const { language } = useLanguage();
  const tr = (en: string, fr: string) => (language === "fr" ? fr : en);

  const [lang, setLang] = useState<PromoLang>(language);
  const [mode, setMode] = useState<"image" | "text">("image");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (!promotion) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [promotion, onClose]);

  if (!promotion) return null;

  const hasImage = !!promotion.image[lang];

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Controls Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="min-w-0 mr-auto flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d21f27] bg-red-50 border border-red-200/70 px-2 py-0.5 rounded-md">
                {tr("Popup Preview", "Aperçu du Popup")}
              </span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <p className="text-xs sm:text-sm font-extrabold text-[#0B2545] truncate">
                {promotion.name || tr("Untitled promotion", "Promotion sans titre")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Segmented
            value={lang}
            onChange={setLang}
            options={[
              { value: "en", label: "EN" },
              { value: "fr", label: "FR" },
            ]}
          />
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "image", label: tr("Image", "Image"), icon: <ImageIcon className="w-3.5 h-3.5" /> },
              { value: "text", label: tr("Text", "Texte"), icon: <Type className="w-3.5 h-3.5" /> },
            ]}
          />
          <Segmented
            value={device}
            onChange={setDevice}
            options={[
              { value: "desktop", label: tr("Desktop", "Bureau"), icon: <Monitor className="w-3.5 h-3.5" /> },
              { value: "mobile", label: tr("Mobile", "Mobile"), icon: <Smartphone className="w-3.5 h-3.5" /> },
            ]}
          />

          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(promotion);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0B2545] hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#D21F27]" />
              {tr("Edit", "Modifier")}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label={tr("Close preview", "Fermer l'aperçu")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start cursor-default"
        onClick={onClose}
      >
        <div
          className="w-full flex flex-col items-center transition-all duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {device === "desktop" ? (
            /* Desktop Browser Frame */
            <div
              className="w-full rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden transition-[max-width] duration-300"
              style={{ maxWidth: mode === "image" && hasImage ? 720 : 580 }}
            >
              {/* Browser Header Bar */}
              <div className="bg-slate-800/95 px-4 py-2.5 flex items-center gap-3 border-b border-slate-700/60 select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10 inline-block" />
                </div>
                <div className="flex-1 mx-2 flex items-center justify-center">
                  <div className="w-full max-w-xs rounded-md bg-slate-900/80 border border-slate-700/60 px-3 py-1 text-[11px] font-mono text-slate-400 flex items-center justify-center gap-1.5">
                    <Globe className="w-3 h-3 text-slate-500" />
                    <span>https://transimex.ca</span>
                  </div>
                </div>
                <div className="w-12 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {lang.toUpperCase()}
                </div>
              </div>

              {/* Simulated Website Canvas */}
              <div className="bg-slate-900/60 backdrop-blur-md p-6 sm:p-10 flex items-center justify-center min-h-[380px] relative">
                {/* Subtle Website Background Placeholder */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                <div className="w-full relative z-10">
                  <PromotionPopupPreview
                    promotion={promotion}
                    lang={lang}
                    forceText={mode === "text"}
                    onClose={onClose}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Mobile Phone Chassis */
            <div className="w-full max-w-[360px] rounded-[42px] bg-slate-900 border-[6px] border-slate-800 shadow-2xl p-2.5 relative">
              {/* Camera Island / Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-full z-30 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-slate-800" />
              </div>

              {/* Mobile Screen Surface */}
              <div className="w-full rounded-[34px] overflow-hidden bg-slate-950 p-3 pt-9 pb-6 min-h-[520px] flex items-center justify-center relative">
                <div className="w-full">
                  <PromotionPopupPreview
                    promotion={promotion}
                    lang={lang}
                    forceText={mode === "text"}
                    onClose={onClose}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Timing & Mode Info Underneath */}
          <div className="mt-5 space-y-1.5 text-center text-xs text-white/80 max-w-md">
            <p className="flex items-center justify-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-red-400" />
              {promotion.delaySeconds === 0
                ? tr("Appears immediately on page load.", "S'affiche dès le chargement de la page.")
                : tr(
                    `Appears ${promotion.delaySeconds}s after the visitor lands on the site.`,
                    `S'affiche ${promotion.delaySeconds} s après l'arrivée du visiteur sur le site.`
                  )}
            </p>
            {mode === "image" && !hasImage && (
              <p className="font-semibold text-amber-300 text-[11px] bg-amber-950/40 border border-amber-800/60 rounded-lg px-3 py-1 inline-block">
                {tr(
                  `No ${lang.toUpperCase()} image uploaded: the website shows the text version for this language.`,
                  `Aucune image ${lang.toUpperCase()} : le site affiche la version texte pour cette langue.`
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
