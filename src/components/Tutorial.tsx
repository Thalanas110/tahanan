import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X, ChevronRight, ChevronLeft, Heart, CheckSquare, StickyNote, Calendar, AlertTriangle, Home } from "lucide-react";

// ─── Storage key ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "tahanan_tutorial_done";

// ─── Tutorial steps definition ────────────────────────────────────────────────
export interface TutorialStep {
  targetId: string;           // data-tutorial-id value
  title: string;
  body: string;
  icon?: ReactNode;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  padding?: number;           // spotlight padding around target (px)
}

const STEPS: TutorialStep[] = [
  {
    targetId: "tutorial-welcome",
    title: "Welcome to Tahanan 🏠",
    body: "This is your shared home — a private space for you and your partner. Let's take a quick tour!",
    icon: <Home className="w-5 h-5 text-primary" />,
    placement: "center",
    padding: 0,
  },
  {
    targetId: "tutorial-dashboard-header",
    title: "Your Daily Dashboard",
    body: "Every day starts here. See your partner's mood, upcoming events, and quick actions — all in one place.",
    icon: <Home className="w-5 h-5 text-primary" />,
    placement: "bottom",
    padding: 16,
  },
  {
    targetId: "tutorial-checkins",
    title: "Daily Check-ins 💛",
    body: "Share how you're feeling today. Your partner sees your mood and energy — no texting needed. You can also view their check-in here.",
    icon: <Heart className="w-5 h-5 text-accent" />,
    placement: "bottom",
    padding: 12,
  },
  {
    targetId: "tutorial-schedule",
    title: "Shared Schedule 📅",
    body: "Your upcoming events, date nights, and appointments — visible to both of you. Nothing slips through the cracks.",
    icon: <Calendar className="w-5 h-5 text-primary" />,
    placement: "top",
    padding: 12,
  },
  {
    targetId: "tutorial-quicklinks",
    title: "Love Notes & Health",
    body: "Write a sweet note for any occasion, or keep track of health reminders together. It's the little things that matter.",
    icon: <StickyNote className="w-5 h-5 text-accent" />,
    placement: "top",
    padding: 12,
  },
  {
    targetId: "tutorial-navbar",
    title: "Navigate Your Space",
    body: "Tap any icon to explore: Check-ins, Notes, Tasks, Calendar, and Health logs. The center SOS button is for emergencies.",
    icon: <CheckSquare className="w-5 h-5 text-primary" />,
    placement: "top",
    padding: 8,
  },
  {
    targetId: "tutorial-sos",
    title: "SOS Emergency Button 🚨",
    body: "If you ever feel unsafe or need your partner urgently — tap SOS. They'll be notified instantly with your location.",
    icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
    placement: "top",
    padding: 16,
  },
  {
    targetId: "tutorial-welcome",
    title: "You're all set! 🎉",
    body: "Tahanan is your private shared space. Explore together, check in daily, and stay close — no matter where you are.",
    icon: <Heart className="w-5 h-5 text-accent" />,
    placement: "center",
    padding: 0,
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────
interface TutorialContextValue {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  start: () => void;
  skip: () => void;
  next: () => void;
  prev: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function TutorialProvider({ children }: { children: ReactNode }) {
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
  }, []);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const value = useMemo<TutorialContextValue>(
    () => ({ isActive, currentStep, totalSteps: STEPS.length, start, skip, next, prev }),
    [isActive, currentStep, start, skip, next, prev],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {isActive && <TutorialOverlay step={STEPS[currentStep]} stepIndex={currentStep} totalSteps={STEPS.length} onNext={next} onPrev={prev} onSkip={skip} />}
    </TutorialContext.Provider>
  );
}

// ─── Auto-start hook (call inside a protected route) ─────────────────────────
export function useTutorialAutoStart() {
  const { start } = useTutorial();
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const t = setTimeout(start, 800);
      return () => clearTimeout(t);
    }
  }, [start]);
}

// ─── Spotlight rect helper ────────────────────────────────────────────────────
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

// ─── Overlay component ────────────────────────────────────────────────────────
interface OverlayProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

function TutorialOverlay({ step, stepIndex, totalSteps, onNext, onPrev, onSkip }: OverlayProps) {
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

  return (
    <>
      {/* Dimmed overlay with spotlight cutout */}
      <svg
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9990,
          pointerEvents: "none",
          transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
        aria-hidden="true"
      >
        <path
          d={svgMask}
          fill="rgba(15,10,5,0.72)"
          fillRule="evenodd"
          style={{ transition: "d 0.35s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>

      {/* Highlight ring around spotlight */}
      {spotRect && !isCenter && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: spotRect.top,
            left: spotRect.left,
            width: spotRect.width,
            height: spotRect.height,
            borderRadius: spotRect.radius,
            zIndex: 9991,
            boxShadow: "0 0 0 3px hsl(14 55% 52% / 0.9), 0 0 0 6px hsl(14 55% 52% / 0.25)",
            pointerEvents: "none",
            transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      )}

      {/* Callout card */}
      <div
        ref={cardRef}
        style={cardStyle}
        className="tutorial-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Tutorial step ${stepIndex + 1} of ${totalSteps}: ${step.title}`}
      >
        {/* Progress bar */}
        <div style={{ height: 3, background: "hsl(24 15% 85%)", borderRadius: "999px 999px 0 0", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "hsl(14 55% 52%)",
              borderRadius: "999px",
              transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </div>

        {/* Card body */}
        <div style={{ padding: "20px 20px 16px" }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {step.icon}
              <span style={{ fontSize: 11, fontWeight: 600, color: "hsl(14 55% 52%)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Step {stepIndex + 1} of {totalSteps}
              </span>
            </div>
            <button
              type="button"
              onClick={onSkip}
              aria-label="Skip tutorial"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "none",
                background: "hsl(35 20% 90%)",
                cursor: "pointer",
                color: "hsl(24 15% 45%)",
                flexShrink: 0,
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 18,
            fontWeight: 700,
            color: "hsl(24 30% 18%)",
            margin: "0 0 8px",
            lineHeight: 1.3,
          }}>
            {step.title}
          </h3>

          {/* Body */}
          <p style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "hsl(24 15% 40%)",
            margin: 0,
          }}>
            {step.body}
          </p>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
            <button
              type="button"
              onClick={onSkip}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                color: "hsl(24 15% 55%)",
                padding: "4px 0",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Skip tour
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              {!isFirst && (
                <button
                  type="button"
                  onClick={onPrev}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid hsl(24 15% 85%)",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "hsl(24 30% 30%)",
                  }}
                >
                  <ChevronLeft style={{ width: 15, height: 15 }} />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={onNext}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "8px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: isLast ? "hsl(350 40% 60%)" : "hsl(14 55% 52%)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                  transition: "background 0.2s",
                }}
              >
                {isLast ? "Done! 🎉" : "Next"}
                {!isLast && <ChevronRight style={{ width: 15, height: 15 }} />}
              </button>
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "0 20px 16px" }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === stepIndex ? 20 : 6,
                height: 6,
                borderRadius: 999,
                background: i === stepIndex ? "hsl(14 55% 52%)" : "hsl(24 15% 82%)",
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        .tutorial-card {
          background: hsl(40 33% 98%);
          border: 1px solid hsl(24 15% 86%);
          border-radius: 20px;
          box-shadow: 0 24px 64px rgba(60,30,10,0.22), 0 4px 16px rgba(60,30,10,0.10);
          overflow: hidden;
          animation: tutorialCardIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
          max-width: min(360px, calc(100vw - 32px));
        }
        @keyframes tutorialCardIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
