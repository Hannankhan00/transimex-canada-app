"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaqItem } from "@/lib/faqTypes";
import {
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  Languages,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function FaqBuilder() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form states
  const [cat, setCat] = useState<FaqItem["category"]>("Customs");
  const [qEn, setQEn] = useState("");
  const [qFr, setQFr] = useState("");
  const [aEn, setAEn] = useState("");
  const [aFr, setAFr] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const categories: ("All" | FaqItem["category"])[] = [
    "All",
    "Customs",
    "Tracking",
    "Billing",
    "Operations",
  ];

  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/faq");
      const data = await res.json();
      if (res.ok && data.faqs) {
        setFaqs(data.faqs);
        setExpandedId((prev) => prev ?? (data.faqs.length > 0 ? data.faqs[0].id : null));
      }
    } catch (err) {
      console.error("Error fetching FAQs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const filteredFaqs = faqs.filter(
    (f) => selectedCategory === "All" || f.category === selectedCategory
  );

  const startCreate = () => {
    setEditingFaq(null);
    setCat("Customs");
    setQEn("");
    setQFr("");
    setAEn("");
    setAFr("");
    setIsCreating(true);
  };

  const startEdit = (faq: FaqItem) => {
    setEditingFaq(faq);
    setCat(faq.category);
    setQEn(faq.question.en);
    setQFr(faq.question.fr);
    setAEn(faq.answer.en);
    setAFr(faq.answer.fr);
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/faq/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete FAQ item");

      setFaqs((prev) => prev.filter((f) => f.id !== id));
      setToastMsg("FAQ item deleted.");
      setTimeout(() => setToastMsg(null), 2500);
    } catch (err: any) {
      alert(err.message || "Error deleting FAQ item");
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qEn.trim() || !aEn.trim()) return;

    try {
      if (editingFaq) {
        const res = await fetch(`/api/admin/faq/${encodeURIComponent(editingFaq.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: cat,
            question: { en: qEn, fr: qFr || qEn },
            answer: { en: aEn, fr: aFr || aEn },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update FAQ item");

        setFaqs((prev) => prev.map((f) => (f.id === editingFaq.id ? data.faq : f)));
        setToastMsg("FAQ updated successfully.");
      } else {
        const res = await fetch("/api/admin/faq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: cat,
            question: { en: qEn, fr: qFr || qEn },
            answer: { en: aEn, fr: aFr || aEn },
            order: faqs.length + 1,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create FAQ item");

        setFaqs((prev) => [...prev, data.faq]);
        setToastMsg("New FAQ item published.");
      }

      setIsCreating(false);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || "Error saving FAQ item");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-0">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#d21f27]" />
            <span>Bilingual FAQ Accordion Builder</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Curate questions and answers rendered in the public /resources and help sections.
          </p>
        </div>

        <button
          type="button"
          onClick={startCreate}
          className="px-3 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-[#d21f27]" />
          <span>Add Question</span>
        </button>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2 border-b border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Categories Bar */}
      <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSelectedCategory(c)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedCategory === c
                ? "bg-[#0B2545] text-white"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Editor Modal / Form */}
      {isCreating && (
        <form onSubmit={handleSaveForm} className="p-5 border-b border-slate-200 bg-slate-50/40 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 font-bold text-slate-800">
            <span>{editingFaq ? "Edit FAQ Item" : "Create New Bilingual FAQ Item"}</span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
              >
                <option value="Customs">Customs</option>
                <option value="Tracking">Tracking</option>
                <option value="Billing">Billing</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Question (English)</label>
              <input
                type="text"
                placeholder="e.g. What documentation is required for CBSA release?"
                value={qEn}
                onChange={(e) => setQEn(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="font-bold text-slate-700 block mb-1">Question (Français)</label>
              <input
                type="text"
                placeholder="ex. Quels documents sont requis pour le dédouanement de l'ASFC ?"
                value={qFr}
                onChange={(e) => setQFr(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="font-bold text-slate-700 block mb-1">Answer (English)</label>
              <textarea
                rows={2}
                placeholder="Comprehensive answer in English..."
                value={aEn}
                onChange={(e) => setAEn(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="font-bold text-slate-700 block mb-1">Réponse (Français)</label>
              <textarea
                rows={2}
                placeholder="Réponse détaillée en français..."
                value={aFr}
                onChange={(e) => setAFr(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0B2545] text-white rounded-xl font-bold shadow-xs transition cursor-pointer"
            >
              Save FAQ Item
            </button>
          </div>
        </form>
      )}

      {/* Accordion List */}
      <div className="divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading FAQ items...</div>
        ) : filteredFaqs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No FAQ items found matching criteria.
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;

            return (
              <div key={faq.id} className="p-4 hover:bg-slate-50/60 transition space-y-2 text-xs">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {faq.category}
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {faq.question.en}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(faq);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 transition"
                      title="Edit Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(faq.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 transition"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-2 pl-4 border-l-2 border-[#0B2545] space-y-2 text-[12px] leading-relaxed text-slate-700 animate-in fade-in duration-150">
                    <p>
                      <strong className="text-slate-900">EN:</strong> {faq.answer.en}
                    </p>
                    <p className="text-slate-600 italic">
                      <strong className="text-slate-900 font-normal">FR:</strong> {faq.answer.fr}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
