"use client";

import React, { useState, useRef } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { UploadCloud, FileImage, AlertCircle } from "lucide-react";

interface PaymentProofUploaderProps {
  invoiceNumber: string;
  onUploaded: () => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export default function PaymentProofUploader({ invoiceNumber, onUploaded }: PaymentProofUploaderProps) {
  const { language } = useLanguage();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage(
        language === "fr"
          ? "Veuillez téléverser une image (JPG, PNG, WEBP) ou un PDF."
          : "Please upload an image (JPG, PNG, WEBP) or PDF file."
      );
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage(language === "fr" ? "Le fichier dépasse la limite de 4 Mo." : "File exceeds the 4MB upload limit.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceNumber)}/payment-proof`, {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          language === "fr"
            ? "Le fichier est trop volumineux ou la connexion a été interrompue. Essayez un fichier plus petit."
            : "The file is too large or the connection was interrupted. Please try a smaller file."
        );
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload payment proof");

      onUploaded();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload payment proof");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  return (
    <div className="space-y-3">
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          dragActive ? "border-[#d21f27] bg-red-50/50" : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-slate-200 text-[#0B2545] flex items-center justify-center">
            <FileImage className="w-6 h-6 text-[#d21f27]" />
          </div>
          <p className="font-bold text-slate-800 text-xs sm:text-sm">
            {language === "fr" ? (
              <>
                Glissez-déposez une capture d'écran de paiement, ou{" "}
                <span className="text-[#d21f27] underline">parcourir les fichiers</span>
              </>
            ) : (
              <>
                Drag &amp; drop a payment screenshot, or <span className="text-[#d21f27] underline">browse files</span>
              </>
            )}
          </p>
          <p className="text-[11px] text-slate-500">
            {language === "fr" ? "JPG, PNG, WEBP ou PDF, jusqu'à 4 Mo" : "JPG, PNG, WEBP, or PDF, up to 4MB"}
          </p>
        </div>

        {uploading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-2">
            <UploadCloud className="w-6 h-6 text-[#d21f27] animate-bounce" />
            <span className="text-xs font-bold text-slate-700">
              {language === "fr" ? "Téléversement en cours..." : "Uploading..."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
