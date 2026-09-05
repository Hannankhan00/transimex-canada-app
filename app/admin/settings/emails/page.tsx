"use client";

import React, { useState, useEffect, useCallback } from "react";
import SettingsNavTabs from "@/components/admin/settings/SettingsNavTabs";
import { EmailTemplate } from "@/lib/emailTemplateTypes";
import {
  Mail,
  Languages,
  Send,
  Save,
  CheckCircle2,
  Copy,
  FileText,
  Sparkles,
  Info,
  RefreshCw,
  Eye,
  Check,
  ArrowLeft,
} from "lucide-react";

export default function AdminEmailsSettingsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("quote-accepted");
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  const [langTab, setLangTab] = useState<"en" | "fr">("en");

  // Form states
  const [subjectEn, setSubjectEn] = useState("");
  const [subjectFr, setSubjectFr] = useState("");
  const [headingEn, setHeadingEn] = useState("");
  const [headingFr, setHeadingFr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyFr, setBodyFr] = useState("");

  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Test email state
  const [testEmailAddress, setTestEmailAddress] = useState("admin@transimex.ca");
  const [sendingTest, setSendingTest] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const activeTemplate = templates.find((t) => t.id === selectedId) || templates[0];

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/emails");
      const data = await res.json();
      if (res.ok && data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error("Error loading email templates:", err);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (activeTemplate) {
      setSubjectEn(activeTemplate.subject.en);
      setSubjectFr(activeTemplate.subject.fr);
      setHeadingEn(activeTemplate.heading.en);
      setHeadingFr(activeTemplate.heading.fr);
      setBodyEn(activeTemplate.body.en);
      setBodyFr(activeTemplate.body.fr);
    }
  }, [selectedId, activeTemplate]);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/settings/emails/${encodeURIComponent(activeTemplate.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: { en: subjectEn, fr: subjectFr },
          heading: { en: headingEn, fr: headingFr },
          body: { en: bodyEn, fr: bodyFr },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update template");

      setToastMsg(`Template "${activeTemplate.name}" updated successfully.`);
      setTimeout(() => setToastMsg(null), 3000);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim() || !activeTemplate) return;

    try {
      setSendingTest(true);
      const subject = langTab === "fr" ? subjectFr : subjectEn;
      const heading = langTab === "fr" ? headingFr : headingEn;
      const content = langTab === "fr" ? bodyFr : bodyEn;

      const res = await fetch("/api/admin/settings/emails/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmailAddress.trim(),
          templateId: activeTemplate.id,
          lang: langTab,
          subject,
          heading,
          content,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch test email");

      setToastMsg(`Test preview email dispatched to ${testEmailAddress}`);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to dispatch test email");
    } finally {
      setSendingTest(false);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Customer Touchpoints &amp; Automated Delivery
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              TRANSACTIONAL CMS
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Bilingual Email Template Editor
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Update the English and French messaging of automated operational emails without requiring developer code changes or redeployments.
          </p>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <SettingsNavTabs />

      {toastMsg && (
        <div className="p-3.5 bg-[#0B2545] text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 3. MAIN EDITOR INTERFACE: TEMPLATE SELECTOR (LEFT) + DUAL EDITOR (RIGHT) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col lg:flex-row min-h-[640px]">
        {/* LEFT PANE: TEMPLATE SELECTOR */}
        <div className={`w-full lg:w-80 border-r border-slate-200 bg-slate-50/60 flex flex-col ${mobileView === "editor" ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Operational Templates
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select an automated workflow to customize.
            </p>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
            {templates.map((tpl) => {
              const isSelected = selectedId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    setSelectedId(tpl.id);
                    setMobileView("editor");
                  }}
                  className={`p-3.5 cursor-pointer transition text-xs relative ${
                    isSelected
                      ? "bg-white border-l-4 border-[#d21f27] shadow-xs"
                      : "hover:bg-white/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {tpl.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 leading-snug">{tpl.name}</h4>
                  <p className="text-slate-500 text-[11px] line-clamp-2 mt-1 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: DUAL-LANGUAGE EDITOR */}
        <div className={`flex-1 flex flex-col bg-white ${mobileView === "list" ? "hidden lg:flex" : "flex"}`}>
          {activeTemplate ? (
            <form onSubmit={handleSaveTemplate} className="flex-1 flex flex-col">
              {/* Editor Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileView("list")}
                    className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-[#0B2545] hover:text-[#d21f27] mb-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Templates</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0B2545]">
                      {activeTemplate.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {activeTemplate.category}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-0.5">
                    {activeTemplate.name}
                  </h2>
                </div>

                {/* Dual-Language Toggle Tabs */}
                <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLangTab("en")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      langTab === "en"
                        ? "bg-white text-[#0B2545] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🇬🇧 English Copy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLangTab("fr")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      langTab === "fr"
                        ? "bg-white text-[#0B2545] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🇨🇦 Copie Française</span>
                  </button>
                </div>
              </div>

              {/* Editor Content Area */}
              <div className="p-6 flex-1 space-y-4 overflow-y-auto text-xs">
                {/* Subject Line */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Email Subject Line ({langTab === "en" ? "English" : "Français"})
                  </label>
                  <input
                    type="text"
                    value={langTab === "en" ? subjectEn : subjectFr}
                    onChange={(e) =>
                      langTab === "en" ? setSubjectEn(e.target.value) : setSubjectFr(e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>

                {/* Headline */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Template Header Title ({langTab === "en" ? "English" : "Français"})
                  </label>
                  <input
                    type="text"
                    value={langTab === "en" ? headingEn : headingFr}
                    onChange={(e) =>
                      langTab === "en" ? setHeadingEn(e.target.value) : setHeadingFr(e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>

                {/* Body Content */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Body Content ({langTab === "en" ? "English" : "Français"})
                  </label>
                  <textarea
                    rows={8}
                    value={langTab === "en" ? bodyEn : bodyFr}
                    onChange={(e) =>
                      langTab === "en" ? setBodyEn(e.target.value) : setBodyFr(e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl p-3 text-xs text-slate-800 outline-none leading-relaxed font-sans"
                  />
                </div>

                {/* Dynamic Variables Helper */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#d21f27]" />
                      <span>Click-to-Copy Dynamic Variables</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Replaced dynamically when automated email fires
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {activeTemplate.placeholders.map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => handleCopyToken(token)}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#0B2545] font-mono text-[11px] text-[#0B2545] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Click to copy variable"
                      >
                        {copiedToken === token ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{token}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Actions & Test Email Dispatcher */}
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                {/* Send Test Email Box */}
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="admin@transimex.ca"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none w-56 font-mono"
                  />
                  <button
                    type="button"
                    disabled={sendingTest}
                    onClick={handleSendTestEmail}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3 h-3 text-[#d21f27]" />
                    <span>{sendingTest ? "Sending..." : "Send Test Preview"}</span>
                  </button>
                </div>

                {/* Save Changes Button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-[#d21f27]" />
                  <span>{saving ? "Saving Changes..." : "Save Template Updates"}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs m-auto">
              Select a template to configure.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
