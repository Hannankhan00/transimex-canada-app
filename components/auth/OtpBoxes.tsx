"use client";

import React, { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  /** Increment to play a shake (wrong code). */
  shakeSignal?: number;
  invalid?: boolean;
  autoFocus?: boolean;
}

/** One box per digit. Typing moves to the next box, Backspace to the previous, paste fills all. */
export default function OtpBoxes({ value, onChange, length = 6, disabled, shakeSignal = 0, invalid, autoFocus }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!shakeSignal) return;
    wrap.current?.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }],
      { duration: 380, easing: "ease-out" }
    );
    refs.current[0]?.focus();
  }, [shakeSignal]);

  const set = (next: string[]) => onChange(next.join("").slice(0, length));
  const focusBox = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const handleChange = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    // Autofill / multi-char input: spread across the boxes.
    const next = [...digits];
    let pos = i;
    for (const ch of typed) {
      if (pos >= length) break;
      next[pos++] = ch;
    }
    set(next);
    focusBox(pos >= length ? length - 1 : pos);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) {
        next[i] = "";
        set(next);
      } else if (i > 0) {
        next[i - 1] = "";
        set(next);
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    focusBox(pasted.length >= length ? length - 1 : pasted.length);
  };

  return (
    <>
      <style>{`
        @keyframes otp-pop { 0% { transform: scale(.4); opacity: 0 } 60% { transform: scale(1.18); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes otp-caret { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
        .otp-pop { animation: otp-pop .22s ease-out }
        .otp-caret { animation: otp-caret 1s step-end infinite }
      `}</style>
      <div ref={wrap} className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste} role="group" aria-label="Verification code">
        {digits.map((d, i) => {
          const isFocus = focused === i && !disabled;
          const ring = invalid
            ? "border-red-400 bg-red-50"
            : isFocus
              ? "border-[#d21f27] bg-white shadow-[0_0_0_4px_rgba(210,31,39,0.12)] -translate-y-0.5"
              : d
                ? "border-slate-400 bg-slate-50"
                : "border-slate-200 bg-white";
          return (
            <div key={i} className={`relative h-14 w-11 sm:h-16 sm:w-12 rounded-xl border-2 transition-all duration-200 ${ring}`}>
              <input
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value=""
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={() => setFocused(i)}
                onBlur={() => setFocused((f) => (f === i ? null : f))}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                disabled={disabled}
                aria-label={`Digit ${i + 1}`}
                className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none"
              />
              {d ? (
                <span key={d} className="otp-pop pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-2xl font-bold text-slate-900">
                  {d}
                </span>
              ) : (
                isFocus && <span className="otp-caret pointer-events-none absolute left-1/2 top-1/2 h-6 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-[#d21f27]" />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
