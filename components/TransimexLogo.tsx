import React from "react";

interface TransimexLogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function TransimexLogo({
  variant = "light",
  size = "md",
  className = "",
}: TransimexLogoProps) {
  const isDark = variant === "dark";

  const sizeMap = {
    sm: {
      icon: "w-8 h-8",
      title: "text-lg",
      subtitle: "text-[9px] tracking-widest",
    },
    md: {
      icon: "w-10 h-10",
      title: "text-2xl",
      subtitle: "text-[10px] tracking-[0.25em]",
    },
    lg: {
      icon: "w-12 h-12",
      title: "text-3xl",
      subtitle: "text-xs tracking-[0.3em]",
    },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      {/* Transimex Logo Mark */}
      <div
        className={`${currentSize.icon} relative flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden flex-shrink-0 p-1.5`}
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Outer circle / shield */}
          <rect width="100" height="100" rx="18" fill="#FFFFFF" />
          <path
            d="M20 30H80V40H58V80H42V40H20V30Z"
            fill="#D9232E"
          />
          {/* Maple Leaf / Arrow accent */}
          <path
            d="M50 15L56 26H44L50 15Z"
            fill="#D9232E"
          />
          <circle cx="50" cy="56" r="6" fill="#0F1E36" />
          <path
            d="M32 78C37 81 43 83 50 83C57 83 63 81 68 78"
            stroke="#0F1E36"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col justify-center">
        <span
          className={`font-serif font-bold leading-tight tracking-tight ${currentSize.title} ${
            isDark ? "text-white" : "text-[#0f1e36]"
          }`}
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Transimex
        </span>
        <span
          className={`font-sans font-semibold uppercase ${currentSize.subtitle} ${
            isDark ? "text-slate-300" : "text-slate-500"
          }`}
        >
          Canada Logistics
        </span>
      </div>
    </div>
  );
}
