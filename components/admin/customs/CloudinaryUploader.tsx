"use client";

import React, { useState, useRef } from "react";
import { DocumentType, VaultDocument } from "@/lib/mockData";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Lock,
  Sparkles,
} from "lucide-react";

interface CloudinaryUploaderProps {
  shipmentId: string;
  onDocumentUploaded: (newDoc: VaultDocument) => void;
}

const DOCUMENT_TYPES: DocumentType[] = [
  "Bill of Lading",
  "Air Waybill",
  "Rail Waybill",
  "Proof of Delivery",
  "Customs Entry",
  "Commercial Invoice",
];

export default function CloudinaryUploader({
  shipmentId,
  onDocumentUploaded,
}: CloudinaryUploaderProps) {
  const [selectedType, setSelectedType] = useState<DocumentType>("Customs Entry");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentUpload, setRecentUpload] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setRecentUpload(null);

    // Validate PDF / format
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setErrorMessage("Regulatory compliance documents must be in PDF format.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage("File exceeds 25MB regulatory upload limit.");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(15);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 25;
        });
      }, 150);

      // Create payload for API
      const res = await fetch(`/api/admin/shipments/${encodeURIComponent(shipmentId)}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          type: selectedType,
          size: `${(file.size / 1024).toFixed(0)} KB`,
          isClientVisible: false, // Default is strictly internal confidential
          fileFormat: "PDF",
          statusText: "Staff Uploaded - Broker Verified",
        }),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document");
      }

      setRecentUpload(file.name);
      if (data.document) {
        onDocumentUploaded(data.document);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process document upload");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      {/* Header & Type Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#d21f27]" />
            <span>Cloudinary Logistics Paperwork Uploader</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Drop verified PDFs into shipment manifest. Uploads default to{" "}
            <strong className="text-slate-700">Internal Confidential</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Document Type:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as DocumentType)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold outline-none focus:border-[#0B2545]"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {recentUpload && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>
            <strong>{recentUpload}</strong> successfully uploaded and linked to {shipmentId} as an internal confidential document.
          </span>
        </div>
      )}

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-[#d21f27] bg-red-50/50"
            : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-slate-200 text-[#0B2545] flex items-center justify-center">
            <FileText className="w-6 h-6 text-[#d21f27]" />
          </div>

          <div>
            <p className="font-bold text-slate-800 text-xs sm:text-sm">
              Drag &amp; drop shipping paperwork PDF, or <span className="text-[#d21f27] underline">browse files</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Target Type: <strong className="text-[#0B2545]">{selectedType}</strong> &bull; Supports official Bill of Lading, AWB, B3, POD
            </p>
          </div>
        </div>

        {uploading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-6 space-y-2">
            <div className="w-full max-w-xs bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#d21f27] h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-700">
              Uploading &amp; Registering Document ({uploadProgress}%)...
            </span>
          </div>
        )}
      </div>

      {/* Security Disclaimer */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span>
            Security Policy: Documents uploaded here are <strong>invisible to clients</strong> until you toggle{" "}
            <em>Public in Client Vault</em> below.
          </span>
        </div>
        <span className="text-[10px] font-bold text-[#0B2545] uppercase">STAFF GATEKEEPER</span>
      </div>
    </div>
  );
}
