import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { X, ChevronRight, ChevronLeft, Heart, CheckSquare, StickyNote, Calendar, AlertTriangle, Home } from "lucide-react";
import { useTutorialProviderLogic, useTutorialAutoStartLogic, useTutorialOverlayLogic } from "./logic/Tutorial";

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
  const { isActive, currentStep, start, skip, next, prev, totalSteps } = useTutorialProviderLogic(STEPS);

  const value = useMemo<TutorialContextValue>(
    () => ({ isActive, currentStep, totalSteps, start, skip, next, prev }),
    [isActive, currentStep, totalSteps, start, skip, next, prev],
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
  useTutorialAutoStartLogic(start);
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
  const { spotRect, cardStyle, cardRef, isCenter, svgMask, isFirst, isLast, progress } = useTutorialOverlayLogic(step, stepIndex, totalSteps);

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
