"use client";

import { useEffect } from "react";

const RIPPLE_DURATION = 500;
const RIPPLE_COLOR = "rgba(37, 99, 235, 0.35)";
const RIPPLE_SELECTOR = "button, [role='button'], a";

export default function RippleEffect() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest(
        RIPPLE_SELECTOR
      ) as HTMLElement | null;

      if (
        !target ||
        target.hasAttribute("disabled") ||
        target.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }

      const rect = target.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const computed = window.getComputedStyle(target);

      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.borderRadius = computed.borderRadius;
      overlay.style.overflow = "hidden";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "2147483647";

      // Keyboard-triggered clicks (Enter/Space) report detail === 0 and no
      // coordinates, so center the ripple instead of pinning it to (0, 0).
      const isKeyboardActivation = e.detail === 0;
      const x = isKeyboardActivation ? rect.width / 2 : e.clientX - rect.left;
      const y = isKeyboardActivation ? rect.height / 2 : e.clientY - rect.top;
      const size =
        Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y)) * 2;

      const ripple = document.createElement("span");
      ripple.style.position = "absolute";
      ripple.style.left = `${x - size / 2}px`;
      ripple.style.top = `${y - size / 2}px`;
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.borderRadius = "9999px";
      ripple.style.background = RIPPLE_COLOR;
      ripple.style.transform = "scale(0)";
      ripple.style.opacity = "1";
      ripple.style.transition = `transform ${RIPPLE_DURATION}ms ease-out, opacity ${RIPPLE_DURATION}ms ease-out`;

      overlay.appendChild(ripple);
      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        ripple.style.transform = "scale(1)";
        ripple.style.opacity = "0";
      });

      window.setTimeout(() => {
        overlay.remove();
      }, RIPPLE_DURATION + 50);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
