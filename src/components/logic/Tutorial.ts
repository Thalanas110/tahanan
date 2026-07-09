import { useCallback, useEffect, useMemo, useState, useLayoutEffect, useRef } from "react";
import { TutorialStep } from "../Tutorial";

const STORAGE_KEY = "tahanan_tutorial_done";

export function useTutorialProviderLogic(STEPS: TutorialStep[]) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const skip = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const next = useCallback(() => {
    setCurrentStep((s) => {
      if (s >= STEPS.length - 1) {
        setIsActive(false);
        localStorage.setItem(STORAGE_KEY, "true");
        return s;
      }
      return s + 1;
    });
  }, [STEPS.length]);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  return { isActive, currentStep, start, skip, next, prev, totalSteps: STEPS.length };
}

export function useTutorialAutoStartLogic(start: () => void) {
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const t = setTimeout(start, 800);
      return () => clearTimeout(t);
    }
  }, [start]);
}

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

function getSpotRect(targetId: string, padding: number): SpotRect | null {
  const el = document.querySelector(`[data-tutorial-id="${targetId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - padding,
    left: r.left - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
    radius: 12,
  };
}

export function useTutorialOverlayLogic(step: TutorialStep, stepIndex: number, totalSteps: number) {
  const [spotRect, setSpotRect] = useState<SpotRect | null>(null);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  const cardRef = useRef<HTMLDivElement>(null);
  const isCenter = step.placement === "center" || !spotRect;

  // Recalculate on step change or resize
  const recalc = useCallback(() => {
    const padding = step.padding ?? 12;
    const rect = getSpotRect(step.targetId, padding);
    setSpotRect(rect);
  }, [step.targetId, step.padding]);

  useLayoutEffect(() => {
    recalc();
  }, [recalc]);

  useEffect(() => {
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [recalc]);

  // Position the callout card near the spotlight
  useLayoutEffect(() => {
    if (isCenter || !spotRect || !cardRef.current) {
      const vwInner = window.innerWidth;
      const cardWInner = Math.min(360, vwInner - 32);
      setCardStyle({
        position: "fixed",
        top: "50%",
        left: Math.max(16, (vwInner - cardWInner) / 2),
        transform: "translateY(-50%)",
        zIndex: 9999,
        width: cardWInner,
      });
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardH = cardRef.current.offsetHeight || 200;
    const cardW = Math.min(360, vw - 32);
    const MARGIN = 16;

    let style: React.CSSProperties = { position: "fixed", zIndex: 9999, width: cardW };
    const placement = step.placement ?? "bottom";

    if (placement === "bottom") {
      const top = spotRect.top + spotRect.height + MARGIN;
      const left = Math.max(MARGIN, Math.min(spotRect.left + spotRect.width / 2 - cardW / 2, vw - cardW - MARGIN));
      style = { ...style, top, left };
    } else if (placement === "top") {
      const top = Math.max(MARGIN, spotRect.top - cardH - MARGIN);
      const left = Math.max(MARGIN, Math.min(spotRect.left + spotRect.width / 2 - cardW / 2, vw - cardW - MARGIN));
      style = { ...style, top, left };
    } else if (placement === "left") {
      const top = Math.max(MARGIN, Math.min(spotRect.top + spotRect.height / 2 - cardH / 2, vh - cardH - MARGIN));
      const left = Math.max(MARGIN, spotRect.left - cardW - MARGIN);
      style = { ...style, top, left };
    } else if (placement === "right") {
      const top = Math.max(MARGIN, Math.min(spotRect.top + spotRect.height / 2 - cardH / 2, vh - cardH - MARGIN));
      const left = Math.min(spotRect.left + spotRect.width + MARGIN, vw - cardW - MARGIN);
      style = { ...style, top, left };
    }

    setCardStyle(style);
  }, [spotRect, isCenter, step.placement]);

  // Build the SVG clip path for the spotlight
  const svgMask = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!spotRect || isCenter) {
      // Full dim, no cutout
      return `M0,0 H${vw} V${vh} H0 Z`;
    }
    const { top, left, width, height, radius } = spotRect;
    // Rounded rect cutout (evenodd fill rule punches a hole)
    return `M0,0 H${vw} V${vh} H0 Z M${left + radius},${top} H${left + width - radius} Q${left + width},${top} ${left + width},${top + radius} V${top + height - radius} Q${left + width},${top + height} ${left + width - radius},${top + height} H${left + radius} Q${left},${top + height} ${left},${top + height - radius} V${top + radius} Q${left},${top} ${left + radius},${top} Z`;
  }, [spotRect, isCenter]);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  // Scroll target into view
  useEffect(() => {
    const el = document.querySelector(`[data-tutorial-id="${step.targetId}"]`);
    if (el && step.placement !== "center") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step.targetId, step.placement]);

  return { spotRect, cardStyle, cardRef, isCenter, svgMask, isFirst, isLast, progress };
}
