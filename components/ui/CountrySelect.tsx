"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { COUNTRIES } from "@/lib/data/countries";

interface CountrySelectProps {
  value: string;
  onChange: (name: string) => void;
  onBlur?: () => void;
  hasError?: boolean;
  placeholder?: string;
}

export default function CountrySelect({
  value,
  onChange,
  onBlur,
  hasError,
  placeholder = "Search country...",
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.name === value),
    [value]
  );

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
        onBlur?.();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onBlur]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  const openDropdown = () => {
    setIsOpen(true);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const selectCountry = (name: string) => {
    onChange(name);
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filteredCountries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = filteredCountries[highlightedIndex];
      if (picked) selectCountry(picked.name);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {!isOpen ? (
        <button
          type="button"
          onClick={openDropdown}
          className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
            hasError ? "border-red-500 bg-red-50/30" : "border-slate-200"
          } hover:bg-white focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900 flex items-center justify-between gap-2 cursor-pointer`}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedCountry ? (
              <>
                <span className="text-sm leading-none">{selectedCountry.flag}</span>
                <span className="truncate">{selectedCountry.name}</span>
              </>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        </button>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedCountry?.name || placeholder}
            className="w-full px-3.5 py-2.5 bg-white border border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900"
          />
        </div>
      )}

      {isOpen && (
        <div className="absolute z-20 mt-1.5 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1">
          {filteredCountries.length === 0 ? (
            <div className="px-3.5 py-2.5 text-xs text-slate-400 font-medium">
              No countries found
            </div>
          ) : (
            filteredCountries.map((c, idx) => (
              <button
                key={c.code}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCountry(c.name)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full px-3.5 py-2 flex items-center gap-2.5 text-xs font-medium text-left transition cursor-pointer ${
                  idx === highlightedIndex ? "bg-slate-100" : "bg-white"
                } ${c.name === value ? "text-[#0B2545] font-bold" : "text-slate-700"}`}
              >
                <span className="text-sm leading-none">{c.flag}</span>
                <span className="truncate">{c.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
