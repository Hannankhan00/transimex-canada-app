"use client";

import React, { useEffect, useState } from "react";
import { Clock, Image as ImageIcon, Monitor, Smartphone, Type, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PromoLang, PromotionDTO } from "@/lib/promotionTypes";
import PromotionPopupPreview from "./PromotionPopupPreview";

interface PromotionPreviewModalProps {
  promotion: PromotionDTO | null;
  onClose: () => void;
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
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
            value === o.value ? "bg-white text-[#0B2545] shadow-xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function PromotionPreviewModal({ promotion, onClose }: PromotionPreviewModalProps) {
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
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150" role="dialog" aria-modal="true">
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 mr-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#d21f27]">{tr("Popup Preview", "Aperçu du Popup")}</p>
          <p className="text-sm font-bold text-[#0B2545] truncate">{promotion.name || tr("Untitled promotion", "Promotion sans titre")}</p>
        </div>

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
            { value: "text", label: tr("Text fallback", "Texte de secours"), icon: <Type className="w-3.5 h-3.5" /> },
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

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer"
          aria-label={tr("Close preview", "Fermer l'aperçu")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start" onClick={onClose}>
        <div
          className="w-full transition-[max-width] duration-200"
          style={{ maxWidth: device === "mobile" ? 360 : mode === "image" && hasImage ? 680 : 520 }}
          onClick={(e) => e.stopPropagation()}
        >
          <PromotionPopupPreview promotion={promotion} lang={lang} forceText={mode === "text"} onClose={onClose} />

          <div className="mt-4 space-y-1.5 text-center text-[11px] text-white/90">
            <p className="flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {promotion.delaySeconds === 0
                ? tr("Appears immediately on page load.", "S'affiche dès le chargement de la page.")
                : tr(
                    `Appears ${promotion.delaySeconds}s after the visitor lands on the site.`,
                    `S'affiche ${promotion.delaySeconds} s après l'arrivée du visiteur sur le site.`
                  )}
            </p>
            {mode === "image" && !hasImage && (
              <p className="font-semibold text-amber-300">
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
