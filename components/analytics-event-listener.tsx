"use client";

import { useEffect } from "react";

type GtagEventParams = Record<string, string | number | boolean | undefined>;

function sendEvent(eventName: string, params: GtagEventParams) {
  if (typeof window === "undefined") return;
  const gtag = (window as typeof window & { gtag?: (...args: any[]) => void }).gtag;
  if (!gtag) return;
  gtag("event", eventName, params);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[GA4]", eventName, params);
  }
}

function extractLabel(target: HTMLElement | null): string {
  if (!target) return "unknown";
  const labeled = target.closest<HTMLElement>("[data-gtag-label]");
  if (labeled?.dataset.gtagLabel) return labeled.dataset.gtagLabel;

  const nameAttr = target.getAttribute("name");
  if (nameAttr) return `${target.tagName.toLowerCase()}:${nameAttr}`;

  const text = target.textContent?.trim() || "";
  if (text) return text.slice(0, 80);

  return target.tagName.toLowerCase();
}

export function AnalyticsEventListener() {
  useEffect(() => {
    let scrollSent: Set<number> = new Set();
    let ticking = false;

    const scrollHandler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        const body = document.body;
        const scrollTop = doc.scrollTop || body.scrollTop;
        const scrollHeight = doc.scrollHeight || body.scrollHeight;
        const clientHeight = doc.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll <= 0) {
          ticking = false;
          return;
        }
        const percent = Math.min(100, Math.round((scrollTop / maxScroll) * 100));
        const milestones = [25, 50, 75, 90, 100];
        for (const m of milestones) {
          if (percent >= m && !scrollSent.has(m)) {
            scrollSent.add(m);
            sendEvent("scroll_depth", { percent: m });
          }
        }
        ticking = false;
      });
    };

    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const label = extractLabel(target);
      sendEvent("click", {
        element: target.tagName.toLowerCase(),
        label,
      });
      if (target.dataset.gtagActivate !== undefined) {
        sendEvent("activate", {
          element: target.tagName.toLowerCase(),
          label,
        });
      }
    };

    const hoverSent = new WeakSet<HTMLElement>();
    const mouseoverHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const isButton = target.tagName.toLowerCase() === "button";
      const hasAttr = target.dataset.gtagHover !== undefined;
      if (!isButton && !hasAttr) return;
      if (hoverSent.has(target)) return;
      hoverSent.add(target);
      const label = extractLabel(target);
      sendEvent("hover", {
        element: target.tagName.toLowerCase(),
        label,
      });
    };

    window.addEventListener("scroll", scrollHandler, { passive: true });
    window.addEventListener("click", clickHandler, { capture: true });
    window.addEventListener("mouseover", mouseoverHandler, { capture: true });

    return () => {
      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("click", clickHandler, { capture: true });
      window.removeEventListener("mouseover", mouseoverHandler, { capture: true });
    };
  }, []);

  return null;
}

