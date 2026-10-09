"use client";

import React, { useRef, useState } from "react";
import { CheckCircle2, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PromoImage } from "@/lib/promotionTypes";

interface PromotionImageUploaderProps {
  value: PromoImage | null;
  onChange: (image: PromoImage | null) => void;
}

interface ConversionInfo {
  sourceFormat: string;
  method: "lossless" | "near-lossless" | "passthrough";
  resized: boolean;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function PromotionImageUploader({ value, onChange }: PromotionImageUploaderProps) {
  const { language } = useLanguage();
  const tr = (en: string, fr: string) => (language === "fr" ? fr : en);

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<"lossless" | "near-lossless">("lossless");
  const [conversion, setConversion] = useState<ConversionInfo | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(tr("Please choose an image file.", "Veuillez choisir un fichier image."));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(tr("Image size must not exceed 10MB.", "L'image ne doit pas dépasser 10 Mo."));
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("mode", mode);
      const res = await fetch("/api/admin/promotions/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || tr("Upload failed", "Échec du téléversement"));
      onChange(data.image as PromoImage);
      setConversion(data.conversion as ConversionInfo);
    } catch (err: any) {
      setError(err.message || tr("Upload failed", "Échec du téléversement"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const saved =
    value?.bytes && value.originalBytes ? Math.round((1 - value.bytes / value.originalBytes) * 100) : null;

  return (
    <div className="space-y-2.5">
      {value ? (
        <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt="" className="w-28 h-20 rounded-lg object-cover bg-slate-100 flex-shrink-0" />
          <div className="min-w-0 flex-1 text-[11px] text-slate-600 space-y-0.5">
            <p className="flex items-center gap-1 font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>WebP · {value.width}×{value.height}px</span>
            </p>
            {value.bytes ? (
              <p>
                {value.originalBytes ? `${formatBytes(value.originalBytes)} → ` : ""}
                <span className="font-bold text-slate-800">{formatBytes(value.bytes)}</span>
                {saved !== null && (
                  <span className={saved >= 0 ? "text-emerald-700" : "text-amber-700"}>
                    {" "}
                    ({saved >= 0 ? `-${saved}%` : `+${Math.abs(saved)}%`})
                  </span>
                )}
              </p>
            ) : null}
            {conversion && (
              <p className="text-slate-500">
                {conversion.method === "passthrough"
                  ? tr("Already WebP: kept untouched.", "Déjà en WebP : conservé tel quel.")
                  : conversion.method === "lossless"
                    ? tr("Lossless: pixel-identical to the original.", "Sans perte : identique pixel pour pixel.")
                    : tr("Near-lossless: visually identical.", "Quasi sans perte : visuellement identique.")}
                {conversion.resized && ` ${tr("Downscaled to 2400px max.", "Réduite à 2400 px max.")}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setConversion(null);
            }}
            className="self-start p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            title={tr("Remove image", "Retirer l'image")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-xl border-2 border-dashed px-4 py-4 text-center transition ${
          dragging ? "border-[#0B2545] bg-slate-50" : "border-slate-200 bg-slate-50/50"
        }`}
      >
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#0B2545] disabled:opacity-60 cursor-pointer"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4 text-[#d21f27]" />}
          {uploading
            ? tr("Converting to WebP…", "Conversion en WebP…")
            : value
              ? tr("Replace image", "Remplacer l'image")
              : tr("Upload image (JPG, PNG, WebP, GIF, AVIF)", "Téléverser une image (JPG, PNG, WebP, GIF, AVIF)")}
        </button>
        <p className="mt-1 text-[10px] text-slate-400">
          {tr("Drag & drop or click · max 10 MB · converted to WebP automatically", "Glisser-déposer ou cliquer · 10 Mo max · convertie automatiquement en WebP")}
        </p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </div>

      <label className="flex items-center gap-2 text-[11px] text-slate-600">
        <span className="font-bold">{tr("Compression", "Compression")}</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "lossless" | "near-lossless")}
          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold outline-none"
        >
          <option value="lossless">{tr("Lossless (exact, recommended)", "Sans perte (exacte, recommandé)")}</option>
          <option value="near-lossless">{tr("Near-lossless (smaller, looks identical)", "Quasi sans perte (plus léger, identique à l'œil)")}</option>
        </select>
      </label>

      {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}
