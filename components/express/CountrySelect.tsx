"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { DHL_COUNTRIES } from "@/lib/data/dhlCountries";

/** Lower case and strip accents, so "cote" finds "Côte d'Ivoire". */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

interface Props {
  /** ISO country code, or "" when nothing is chosen yet. */
  value: string;
  onChange: (code: string) => void;
  /** Tailwind classes for the input, so the admin and client forms keep their own look. */
  className: string;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * Searchable country picker. Typing narrows the list to countries whose name STARTS with
 * what was typed ("p" shows every P country, "pa" only those starting with "pa").
 */
export default function CountrySelect({ value, onChange, className, placeholder, ariaLabel }: Props) {
  const { language } = useLanguage();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const nameOf = (c: { name: string; nameFr: string }) => (language === "fr" ? c.nameFr : c.name);
  const selected = DHL_COUNTRIES.find((c) => c.code === value);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const q = fold(query);
    if (!typing || !q) return DHL_COUNTRIES;
    return DHL_COUNTRIES.filter((c) => fold(c.name).startsWith(q) || fold(c.nameFr).startsWith(q));
  }, [query, typing]);

  const close = () => {
    setOpen(false);
    setTyping(false);
    setQuery("");
  };

  const choose = (code: string) => {
    onChange(code);
    close();
  };

  // Close on a click outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => rootRef.current && !rootRef.current.contains(e.target as Node) && close();
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (matches[active]) choose(matches[active].code);
    } else if (e.key === "Escape") {
      close();
    }
  };

  const shown = typing ? query : selected ? `${selected.flag} ${nameOf(selected)}` : "";

  return (
    <div ref={rootRef} className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        className={`${className} pr-9`}
        value={shown}
        placeholder={placeholder}
        onFocus={(e) => {
          setOpen(true);
          setActive(Math.max(0, DHL_COUNTRIES.findIndex((c) => c.code === value)));
          e.currentTarget.select();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setTyping(true);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

      {open && (
        <ul id={listId} ref={listRef} role="listbox" className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {matches.length === 0 ? (
            <li className="px-3.5 py-2.5 text-xs text-slate-400">{language === "fr" ? "Aucun pays trouvé" : "No country found"}</li>
          ) : (
            matches.map((c, i) => (
              <li
                key={c.code}
                role="option"
                aria-selected={c.code === value}
                // mousedown, not click: the input would lose focus and close the list before a click lands.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(c.code);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2 ${i === active ? "bg-slate-100" : ""} ${c.code === value ? "font-bold text-[#0B2545]" : "text-slate-800"}`}
              >
                <span aria-hidden="true">{c.flag}</span>
                {nameOf(c)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
