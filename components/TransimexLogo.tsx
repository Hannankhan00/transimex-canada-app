import React from "react";
import Image from "next/image";

interface TransimexLogoProps {
  variant?: "light" | "dark" | "sidebar";
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Source artwork is 384x140 on a white background.
const LOGO_WIDTH = 384;
const LOGO_HEIGHT = 140;

export default function TransimexLogo({
  variant = "light",
  size = "md",
  className = "",
}: TransimexLogoProps) {
  const isDark = variant === "dark";

  // Transparent logo with white lettering, made for dark-blue sidebars.
  if (variant === "sidebar") {
    return (
      <div className={`inline-flex items-center select-none flex-shrink-0 ${className}`}>
        <Image
          src="/assets/logo-blue-trim.png"
          alt="Transimex Canada"
          width={1778}
          height={519}
          priority
          className="h-14 w-auto"
        />
      </div>
    );
  }

  const heightMap = {
    sm: "h-10",
    md: "h-14",
    lg: "h-16",
  };

  return (
    <div
      className={`inline-flex items-center select-none flex-shrink-0 ${
        isDark ? "bg-white rounded-xl px-2.5 py-1 shadow-sm" : ""
      } ${className}`}
    >
      <Image
        src="/assets/Transimex-Logo-Premium-v3.webp"
        alt="Transimex Canada"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        priority
        className={`${heightMap[size]} w-auto`}
      />
    </div>
  );
}
