"use client";

import React, { useState } from "react";
import {
  Search,
  Ship,
  Truck,
  Package,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Anchor,
  ExternalLink,
} from "lucide-react";
import ContainerMilestoneTimeline from "@/components/portal/ContainerMilestoneTimeline";

interface PublicTrackingResult {
  success: boolean;
  resultType: "SHIPMENT" | "CONTAINER" | "BOOKING_REFERENCE";
  shipment?: {
    trackingNumber: string;
    status: string;
    progress: number;
    transportMode: string;
    equipment?: string;
    commodity?: string;
    origin: { city: string; detail?: string };
    destination: { city: string; detail?: string };
    eta?: string;
    customsStatus?: string;
    timeline?: Array<{
      title: string;
      location: string;
      timestamp: string | null;
      statusText: string;
      completed: boolean;
    }>;
    vessel?: any;
    containers?: any[];
  };
  matchedReference?: string;
  lastUpdated?: string;
  container?: any;
  vessel?: any;
  containers?: any[];
}

export default function PublicTrackingSection() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicTrackingResult | null>(null);

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = query.trim();
    if (!cleaned) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/track?q=${encodeURIComponent(cleaned)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to find tracking information.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to locate shipment. Please verify your reference number.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "In Transit":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Out for Delivery":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Customs Hold":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-12">
      {/* Header & Search Bar */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="text-3xl font-extrabold text-[#0B2545] tracking-tight">
          Track Your Cargo Instantly
        </h2>
        <p className="mt-2 text-sm md:text-base text-slate-600">
          Enter your Transimex Tracking ID, ocean container number, or carrier booking reference.
        </p>

        <form onSubmit={handleTrack} className="mt-6 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. TMX-2026-00847, CMAU1234567, or CAN1028600"
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545] focus:border-transparent text-sm md:text-base shadow-sm font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3.5 bg-[#0B2545] hover:bg-[#134074] text-white rounded-xl font-semibold text-sm md:text-base transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <span>Track</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          <span>Supported references:</span>
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">TMX-XXXX</span>
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">CMA CGM</span>
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">Maersk</span>
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">MSC</span>
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">DHL</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm max-w-2xl mx-auto animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{error}</p>
            <p className="text-xs text-red-600 mt-1">
              Please double check the ID, or contact Transimex support if you need assistance.
            </p>
          </div>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Result: Shipment Type */}
          {result.resultType === "SHIPMENT" && result.shipment && (
            <div>
              {/* Top Banner */}
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900 font-mono">
                      {result.shipment.trackingNumber}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        result.shipment.status
                      )}`}
                    >
                      {result.shipment.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {[result.shipment.transportMode, result.shipment.equipment, result.shipment.commodity]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>

                {result.shipment.eta && (
                  <div className="text-right">
                    <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">
                      Estimated Arrival
                    </span>
                    <span className="text-sm md:text-base font-bold text-slate-800">
                      {new Date(result.shipment.eta).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="px-6 pt-5 pb-3">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
                  <span>Shipment Progress</span>
                  <span>{result.shipment.progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0B2545] transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${Math.min(Math.max(result.shipment.progress, 5), 100)}%` }}
                  />
                </div>
              </div>

              {/* Origin & Destination Route Card */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                      Origin
                    </span>
                    <p className="font-semibold text-slate-800 text-sm md:text-base">
                      {result.shipment.origin.city}
                    </p>
                    {result.shipment.origin.detail && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {result.shipment.origin.detail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                    <Anchor className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                      Destination
                    </span>
                    <p className="font-semibold text-slate-800 text-sm md:text-base">
                      {result.shipment.destination.city}
                    </p>
                    {result.shipment.destination.detail && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {result.shipment.destination.detail}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Milestone Timeline */}
              {result.shipment.timeline && result.shipment.timeline.length > 0 && (
                <div className="p-6 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0B2545]" />
                    <span>Milestone Journey</span>
                  </h4>
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {result.shipment.timeline.map((step, idx) => (
                      <div key={idx} className="relative group">
                        <div
                          className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            step.completed
                              ? "bg-[#0B2545] border-[#0B2545] text-white"
                              : "bg-white border-slate-300 text-transparent"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <p className="font-semibold text-slate-800 text-sm">{step.title}</p>
                          {step.timestamp && (
                            <span className="text-xs text-slate-400 font-mono">
                              {new Date(step.timestamp).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {step.location} • {step.statusText}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Container Milestones (if linked) */}
              {result.shipment.containers && result.shipment.containers.length > 0 && (
                <div className="p-6 bg-slate-50/50">
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Ship className="w-4 h-4 text-[#0B2545]" />
                    <span>Ocean Containers Tracking</span>
                  </h4>
                  <div className="space-y-4">
                    {result.shipment.containers.map((c: any, i: number) => (
                      <div key={i} className="p-4 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono font-bold text-sm text-slate-800">
                            {c.containerNumber}
                          </span>
                          {c.status && (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                c.status === "DELIVERED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {c.status}
                            </span>
                          )}
                        </div>
                        <ContainerMilestoneTimeline tracking={c} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Result: Direct Container Query */}
          {result.resultType === "CONTAINER" && result.container && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold font-mono text-slate-900">
                    {result.container.containerNumber}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ocean Container Live Milestone Tracking
                  </p>
                </div>
                {result.container.status && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      result.container.status === "DELIVERED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {result.container.status}
                  </span>
                )}
              </div>
              <ContainerMilestoneTimeline tracking={result.container} />
            </div>
          )}

          {/* Result: Booking Reference Query */}
          {result.resultType === "BOOKING_REFERENCE" && (
            <div className="p-6">
              <div className="mb-4">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Carrier Booking Reference
                </span>
                <h3 className="text-xl font-bold font-mono text-slate-900">{query}</h3>
              </div>
              {result.containers && result.containers.length > 0 ? (
                <div className="space-y-4">
                  {result.containers.map((c: any, i: number) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h5 className="font-mono font-bold text-sm text-slate-800 mb-2">
                        Container: {c.containerNumber}
                      </h5>
                      <ContainerMilestoneTimeline tracking={c} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Carrier booking received. No individual containers have been assigned yet.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
