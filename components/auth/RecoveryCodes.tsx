"use client";

import React, { useState } from "react";
import { Copy, Download, CheckCircle2 } from "lucide-react";

/** Shows freshly generated recovery codes once, with copy/download, and a button to confirm they were saved. */
export default function RecoveryCodes({
  codes,
  fr,
  onDone,
}: {
  codes: string[];
  fr: boolean;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const text = codes.join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard blocked: user can still select the codes by hand */
    }
  };

  const download = () => {
    const blob = new Blob([`Transimex recovery codes\n\n${text}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transimex-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900 font-medium">
        {fr
          ? "Conservez ces codes de récupération en lieu sûr. Chacun ne peut servir qu'une fois si vous perdez votre téléphone. Ils ne seront plus affichés."
          : "Keep these recovery codes somewhere safe. Each works once if you lose your phone. They will not be shown again."}
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-900">
        {codes.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <Copy className="w-3.5 h-3.5" />
          {copied ? (fr ? "Copié" : "Copied") : fr ? "Copier" : "Copy"}
        </button>
        <button type="button" onClick={download} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <Download className="w-3.5 h-3.5" />
          {fr ? "Télécharger" : "Download"}
        </button>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="accent-[#d21f27]" />
        {fr ? "J'ai conservé mes codes de récupération" : "I have saved my recovery codes"}
      </label>
      <button
        type="button"
        disabled={!saved}
        onClick={onDone}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#d21f27] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
      >
        <CheckCircle2 className="w-4 h-4" />
        {fr ? "Continuer" : "Continue"}
      </button>
    </div>
  );
}
