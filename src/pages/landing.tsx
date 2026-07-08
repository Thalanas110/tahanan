import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

// ─── Simple animation hook ────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ─── Feature data ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    emoji: "🩺",
    title: "Daily Check-ins",
    description:
      "Share your mood, energy, and a little note every day. Always know how your person is really feeling.",
  },
  {
    emoji: "💌",
    title: "Love Notes",
    description:
      "Write heartfelt messages that arrive whenever they need them most. A little love delivered straight to their screen.",
  },
  {
    emoji: "📋",
    title: "Shared Tasks",
    description:
      "Groceries, errands, dreams — keep a living list you both contribute to and tick off together.",
  },
  {
    emoji: "📅",
    title: "Couple Calendar",
    description:
      "Plan dates, anniversaries, and everyday moments in one shared calendar built for two.",
  },
  {
    emoji: "🏥",
    title: "Health Logs",
    description:
      "Track medications, symptoms, and wellness milestones. Support each other through the little things.",
  },
  {
    emoji: "🆘",
    title: "Emergency SOS",
    description:
      "Send an instant alert when you need your partner right now. No words needed — they'll know.",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "Tahanan feels like a warm hug. The check-ins changed how we communicate entirely.",
    name: "Sofia & Marco",
    detail: "Together 3 years, long-distance",
  },
  {
    quote:
      "Love notes sent at 2 AM just hit different. We've never felt closer despite the distance.",
    name: "Lia & James",
    detail: "Manila & Toronto",
  },
  {
    quote:
      "The health log feature helped us both stay on top of our routines. So thoughtful.",
    name: "Cara & Nate",
    detail: "Together 5 years",
  },
] as const;

const STEPS = [
  {
    step: "01",
    title: "Create your account",
    desc: "Sign up in seconds. No credit card, no pressure.",
  },
  {
    step: "02",
    title: "Invite your partner",
    desc: "Share a unique invite code. Once they join, you're linked.",
  },
  {
    step: "03",
    title: "Feel closer every day",
    desc: "Check in, send notes, plan life — all in one cozy space.",
  },
] as const;

// ─── Section animations wrapper ───────────────────────────────────────────────
function AnimatedSection({
  children,
  className,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView();
  return (
    <section
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

// ─── Dashboard preview card ───────────────────────────────────────────────────
function AppPreview() {
  return (
    <div
      style={{
        background: "hsl(40 33% 98%)",
        borderRadius: "24px",
        boxShadow:
          "0 32px 80px rgba(80, 40, 20, 0.18), 0 4px 16px rgba(80,40,20,0.1)",
        overflow: "hidden",
        border: "1px solid hsl(24 15% 88%)",
        width: "100%",
        maxWidth: "360px",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          background: "hsl(14 55% 52%)",
          padding: "12px 20px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            color: "white",
            fontFamily: "'Fraunces', serif",
            fontSize: "18px",
            fontWeight: 700,
          }}
        >
          Tahanan
        </span>
        <span style={{ fontSize: "18px" }}>🏡</span>
      </div>

      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Welcome */}
        <div>
          <p style={{ fontSize: "11px", color: "hsl(24 15% 55%)", margin: 0 }}>
            Tuesday, July 8
          </p>
          <h3
            style={{
              margin: "2px 0 0",
              fontFamily: "'Fraunces', serif",
              fontSize: "20px",
              fontWeight: 700,
              color: "hsl(24 30% 18%)",
            }}
          >
            Welcome home, Maya. 🌿
          </h3>
        </div>

        {/* Check-in cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "hsl(14 55% 52%)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Today's Check-ins
          </p>
          {(
            [
              { name: "You", mood: "☀️ Hopeful", energy: "High energy", color: "hsl(14 55% 52%)" },
              { name: "Sam", mood: "🌧 Tired", energy: "Low energy", color: "hsl(120 15% 45%)" },
            ] as const
          ).map((c) => (
            <div
              key={c.name}
              style={{
                background: "hsl(40 33% 96%)",
                borderRadius: "12px",
                padding: "10px 14px",
                border: "1px solid hsl(24 15% 88%)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: c.color }}>
                  {c.name}
                </span>
                <span style={{ fontSize: "10px", color: "hsl(24 15% 55%)" }}>{c.energy}</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "13px", fontWeight: 500, color: "hsl(24 30% 18%)" }}>
                {c.mood}
              </p>
            </div>
          ))}
        </div>

        {/* Love note */}
        <div
          style={{
            background: "hsl(350 40% 96%)",
            borderRadius: "12px",
            padding: "12px 14px",
            border: "1px solid hsl(350 40% 88%)",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: "18px", lineHeight: 1 }}>💌</span>
          <div>
            <p style={{ margin: 0, fontSize: "11px", color: "hsl(350 40% 45%)", fontWeight: 600 }}>
              Love Note from Sam
            </p>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "hsl(24 30% 30%)", fontStyle: "italic" }}>
              "Couldn't stop thinking about you today..."
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          {(["📋 Tasks", "📅 Calendar", "🆘 SOS"] as const).map((label) => (
            <div
              key={label}
              style={{
                flex: 1,
                background: "hsl(35 20% 92%)",
                borderRadius: "10px",
                padding: "8px 4px",
                textAlign: "center",
                fontSize: "10px",
                fontWeight: 600,
                color: "hsl(24 30% 30%)",
                border: "1px solid hsl(24 15% 86%)",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main landing page ─────────────────────────────────────────────────────────
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "hsl(40 33% 96%)",
        fontFamily: "'DM Sans', sans-serif",
        color: "hsl(24 30% 18%)",
        overflowX: "hidden",
      }}
    >
      {/* ── Keyframes + responsive styles ──────────────────────────────── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(40px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes floatChip {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .landing-nav-link:hover { color: hsl(24 30% 18%) !important; }
        .landing-feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(80,40,20,0.12);
        }
        .landing-cta-pill:hover { transform: scale(1.03); }
        .landing-outline-btn:hover { border-color: hsl(14 55% 52%) !important; }

        /* ── Nav desktop links: hidden on mobile ── */
        .landing-desktop-links { display: flex; align-items: center; gap: 4px; }
        .landing-mobile-menu-btn { display: none; }

        /* ── Hero app preview: always centered ── */
        .landing-hero-preview-wrap { flex: 1 1 280px; }

        /* ── Floating chips: hide on small screens ── */
        .landing-float-chip { display: flex; }

        @media (max-width: 680px) {
          .landing-desktop-links { display: none !important; }
          .landing-mobile-menu-btn { display: flex !important; }

          /* Mobile dropdown */
          .landing-mobile-menu {
            display: flex;
            flex-direction: column;
            gap: 4px;
            position: fixed;
            top: 64px;
            left: 0;
            right: 0;
            background: hsl(40 33% 97%);
            border-bottom: 1px solid hsl(24 15% 85%);
            padding: 12px 16px 16px;
            z-index: 49;
            animation: slideDown 0.2s ease;
          }
          .landing-mobile-menu a, .landing-mobile-menu [data-mobile-link] {
            display: block;
            padding: 12px 16px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 500;
            color: hsl(24 20% 40%);
            text-decoration: none;
          }
          .landing-mobile-menu a:hover { background: hsl(35 20% 92%); }

          .landing-float-chip { display: none !important; }

          .landing-hero-preview-wrap {
            display: flex;
            justify-content: center;
            width: 100%;
          }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "0 clamp(16px, 4vw, 48px)",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background 0.3s, box-shadow 0.3s",
          background: scrolled || menuOpen ? "hsla(40, 33%, 96%, 0.95)" : "transparent",
          backdropFilter: scrolled || menuOpen ? "blur(12px)" : "none",
          boxShadow: scrolled || menuOpen ? "0 1px 0 hsl(24 15% 85%)" : "none",
        }}
      >
        {/* Logo */}
        <a
          href="/"
          style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
        >
          <span style={{ fontSize: "22px" }}>🏡</span>
          <span
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 800,
              fontSize: "21px",
              color: "hsl(24 30% 18%)",
              letterSpacing: "-0.5px",
            }}
          >
            Tahanan
          </span>
        </a>

        {/* Desktop nav links */}
        <div className="landing-desktop-links">
          {(["#features", "#how-it-works"] as const).map((href) => (
            <a
              key={href}
              href={href}
              className="landing-nav-link"
              style={{
                color: "hsl(24 20% 45%)",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 500,
                padding: "8px 12px",
                borderRadius: "8px",
                transition: "color 0.2s",
              }}
            >
              {href === "#features" ? "Features" : "How it works"}
            </a>
          ))}
          <Link
            href="/login"
            className="landing-nav-link"
            style={{
              color: "hsl(24 20% 45%)",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 500,
              padding: "8px 12px",
              borderRadius: "8px",
              marginRight: "4px",
            }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="landing-cta-pill"
            id="nav-cta-signup"
            style={{
              background: "hsl(14 55% 52%)",
              color: "white",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
              padding: "10px 20px",
              borderRadius: "100px",
              boxShadow: "0 2px 8px rgba(190, 90, 60, 0.35)",
              transition: "transform 0.15s",
              display: "inline-block",
            }}
          >
            Get started — free
          </Link>
        </div>

        {/* Mobile: CTA + hamburger */}
        <div
          className="landing-mobile-menu-btn"
          style={{ alignItems: "center", gap: "8px" }}
        >
          <Link
            href="/signup"
            className="landing-cta-pill"
            style={{
              background: "hsl(14 55% 52%)",
              color: "white",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 600,
              padding: "9px 16px",
              borderRadius: "100px",
              boxShadow: "0 2px 8px rgba(190, 90, 60, 0.35)",
              display: "inline-block",
            }}
          >
            Get started
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              borderRadius: "8px",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  width: "22px",
                  height: "2px",
                  background: "hsl(24 30% 25%)",
                  borderRadius: "2px",
                  transition: "transform 0.2s, opacity 0.2s",
                  transform:
                    menuOpen && i === 0
                      ? "translateY(7px) rotate(45deg)"
                      : menuOpen && i === 2
                        ? "translateY(-7px) rotate(-45deg)"
                        : "none",
                  opacity: menuOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="landing-mobile-menu">
          <a href="#features" onClick={() => setMenuOpen(false)} style={{ color: "hsl(24 20% 40%)", textDecoration: "none", display: "block", padding: "12px 16px", borderRadius: "10px", fontSize: "15px", fontWeight: 500 }}>Features</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} style={{ color: "hsl(24 20% 40%)", textDecoration: "none", display: "block", padding: "12px 16px", borderRadius: "10px", fontSize: "15px", fontWeight: 500 }}>How it works</a>
          <Link href="/login" style={{ color: "hsl(24 20% 40%)", textDecoration: "none", display: "block", padding: "12px 16px", borderRadius: "10px", fontSize: "15px", fontWeight: 500 }}>Log in</Link>
        </div>
      )}

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <header
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "100px clamp(16px, 4vw, 48px) 60px",
          maxWidth: "1200px",
          margin: "0 auto",
          gap: "48px",
          flexWrap: "wrap",
        }}
      >
        {/* Left copy */}
        <div style={{ flex: "1 1 min(340px, 100%)", maxWidth: "520px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "hsl(350 40% 93%)",
              border: "1px solid hsl(350 40% 82%)",
              borderRadius: "100px",
              padding: "5px 14px",
              fontSize: "13px",
              fontWeight: 600,
              color: "hsl(350 40% 40%)",
              marginBottom: "28px",
              animation: "fadeSlideUp 0.6s ease both",
            }}
          >
            <span>💛</span> For the two of you
          </div>

          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 900,
              fontSize: "clamp(38px, 6vw, 66px)",
              lineHeight: 1.05,
              letterSpacing: "-2px",
              margin: "0 0 20px",
              animation: "fadeSlideUp 0.6s ease 0.1s both",
            }}
          >
            The app for
            <br />
            your{" "}
            <span
              style={{
                fontStyle: "italic",
                background: "linear-gradient(135deg, hsl(14 60% 52%), hsl(350 50% 58%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              relationship.
            </span>
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.7,
              color: "hsl(24 15% 42%)",
              margin: "0 0 36px",
              maxWidth: "420px",
              animation: "fadeSlideUp 0.6s ease 0.2s both",
            }}
          >
            Tahanan keeps you close with daily check-ins, heartfelt love notes,
            a shared calendar, and a little SOS for when you need each other most.
            Your home, wherever you are.
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
              animation: "fadeSlideUp 0.6s ease 0.3s both",
            }}
          >
            <Link
              href="/signup"
              id="hero-cta-signup"
              className="landing-cta-pill"
              style={{
                background: "hsl(14 55% 52%)",
                color: "white",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: 700,
                padding: "15px 32px",
                borderRadius: "100px",
                boxShadow: "0 4px 20px rgba(190, 90, 60, 0.4)",
                transition: "transform 0.15s",
                display: "inline-block",
              }}
            >
              Open Tahanan, free
            </Link>
            <a
              href="#how-it-works"
              id="hero-cta-how"
              className="landing-outline-btn"
              style={{
                color: "hsl(24 30% 18%)",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: 600,
                padding: "15px 24px",
                borderRadius: "100px",
                border: "1.5px solid hsl(24 15% 80%)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "border-color 0.2s",
              }}
            >
              See how it works →
            </a>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              marginTop: "28px",
              animation: "fadeSlideUp 0.6s ease 0.4s both",
            }}
          >
            {(["✓ Free for two", "✓ Works long-distance", "✓ Private & secure"] as const).map((t) => (
              <span key={t} style={{ fontSize: "13px", color: "hsl(24 15% 50%)", fontWeight: 500 }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right — app preview */}
        <div
          className="landing-hero-preview-wrap"
          style={{
            flex: "1 1 280px",
            display: "flex",
            justifyContent: "center",
            position: "relative",
            animation: "floatIn 0.9s ease 0.2s both",
          }}
        >
          {/* Background blob */}
          <div
            style={{
              position: "absolute",
              width: "420px",
              height: "420px",
              background: "radial-gradient(ellipse, hsl(14 60% 88%) 0%, transparent 70%)",
              borderRadius: "50%",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              filter: "blur(40px)",
              opacity: 0.7,
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <AppPreview />
          </div>

          <div
            className="landing-float-chip"
            style={{
              position: "absolute",
              top: "10%",
              left: "-5%",
              background: "white",
              borderRadius: "100px",
              padding: "8px 16px",
              boxShadow: "0 8px 24px rgba(80, 40, 20, 0.12)",
              fontSize: "13px",
              fontWeight: 600,
              color: "hsl(24 30% 20%)",
              alignItems: "center",
              gap: "8px",
              animation: "floatChip 3.5s ease-in-out infinite",
              whiteSpace: "nowrap",
              zIndex: 2,
            }}
          >
            <span>💌</span> Sam sent you a note
          </div>
          <div
            className="landing-float-chip"
            style={{
              position: "absolute",
              bottom: "12%",
              right: "-5%",
              background: "white",
              borderRadius: "100px",
              padding: "8px 16px",
              boxShadow: "0 8px 24px rgba(80, 40, 20, 0.12)",
              fontSize: "13px",
              fontWeight: 600,
              color: "hsl(24 30% 20%)",
              alignItems: "center",
              gap: "8px",
              animation: "floatChip 3.5s ease-in-out 1.2s infinite",
              whiteSpace: "nowrap",
              zIndex: 2,
            }}
          >
            <span>✅</span> Task completed!
          </div>
        </div>
      </header>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <div
        id="features"
        style={{ padding: "100px clamp(16px, 4vw, 48px)", maxWidth: "1200px", margin: "0 auto" }}
      >
        <AnimatedSection style={{ textAlign: "center", marginBottom: "64px" }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "hsl(14 55% 52%)",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              margin: "0 0 12px",
            }}
          >
            Everything you need
          </p>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 800,
              fontSize: "clamp(30px, 5vw, 50px)",
              letterSpacing: "-1.5px",
              margin: "0 0 16px",
              lineHeight: 1.1,
            }}
          >
            Built for the two of you
          </h2>
          <p style={{ fontSize: "17px", color: "hsl(24 15% 45%)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
            Every feature in Tahanan exists to make your relationship feel closer, easier, and more intentional.
          </p>
        </AnimatedSection>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {FEATURES.map((f, i) => (
            <AnimatedSection key={f.title} delay={i * 80}>
              <div
                className="landing-feature-card"
                style={{
                  background: "hsl(40 33% 98%)",
                  border: "1px solid hsl(24 15% 87%)",
                  borderRadius: "20px",
                  padding: "28px",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  height: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "16px", lineHeight: 1 }}>
                  {f.emoji}
                </div>
                <h3
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 700,
                    fontSize: "20px",
                    margin: "0 0 10px",
                    color: "hsl(24 30% 18%)",
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ fontSize: "15px", color: "hsl(24 15% 45%)", lineHeight: 1.65, margin: 0 }}>
                  {f.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <div
        id="how-it-works"
        style={{
          background: "hsl(24 30% 14%)",
          color: "hsl(40 33% 96%)",
          padding: "100px clamp(16px, 4vw, 48px)",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <AnimatedSection style={{ textAlign: "center", marginBottom: "64px" }}>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "hsl(14 50% 60%)",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                margin: "0 0 12px",
              }}
            >
              Simple to start
            </p>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 800,
                fontSize: "clamp(30px, 5vw, 50px)",
                letterSpacing: "-1.5px",
                margin: 0,
                lineHeight: 1.1,
                color: "hsl(40 33% 96%)",
              }}
            >
              Up in three steps
            </h2>
          </AnimatedSection>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "32px" }}>
            {STEPS.map((s, i) => (
              <AnimatedSection key={s.step} delay={i * 120}>
                <div>
                  <div
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: "56px",
                      fontWeight: 900,
                      color: "hsl(14 50% 40%)",
                      lineHeight: 1,
                      marginBottom: "16px",
                      letterSpacing: "-2px",
                    }}
                  >
                    {s.step}
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 700,
                      fontSize: "22px",
                      margin: "0 0 10px",
                      color: "hsl(40 33% 96%)",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p style={{ fontSize: "15px", color: "hsl(35 20% 65%)", lineHeight: 1.65, margin: 0 }}>
                    {s.desc}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <div style={{ padding: "100px clamp(16px, 4vw, 48px)", maxWidth: "1200px", margin: "0 auto" }}>
        <AnimatedSection style={{ textAlign: "center", marginBottom: "64px" }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "hsl(14 55% 52%)",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              margin: "0 0 12px",
            }}
          >
            Love stories
          </p>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 800,
              fontSize: "clamp(30px, 5vw, 50px)",
              letterSpacing: "-1.5px",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Couples love Tahanan
          </h2>
        </AnimatedSection>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {TESTIMONIALS.map((t, i) => (
            <AnimatedSection key={t.name} delay={i * 100}>
              <div
                style={{
                  background: "hsl(40 33% 98%)",
                  border: "1px solid hsl(24 15% 87%)",
                  borderRadius: "20px",
                  padding: "32px",
                  height: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "12px" }}>⭐⭐⭐⭐⭐</div>
                <p
                  style={{
                    fontSize: "16px",
                    lineHeight: 1.7,
                    color: "hsl(24 30% 22%)",
                    fontStyle: "italic",
                    margin: "0 0 20px",
                  }}
                >
                  "{t.quote}"
                </p>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "14px", margin: 0, color: "hsl(24 30% 18%)" }}>
                    {t.name}
                  </p>
                  <p style={{ fontSize: "12px", color: "hsl(24 15% 55%)", margin: "2px 0 0" }}>
                    {t.detail}
                  </p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>

      {/* ── CTA Banner ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "0 clamp(16px, 4vw, 48px) 80px", maxWidth: "1200px", margin: "0 auto" }}>
        <AnimatedSection>
          <div
            style={{
              background: "linear-gradient(135deg, hsl(14 55% 52%) 0%, hsl(350 45% 55%) 100%)",
              borderRadius: "28px",
              padding: "clamp(40px, 6vw, 72px) clamp(24px, 5vw, 64px)",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "300px",
                height: "300px",
                background: "rgba(255,255,255,0.07)",
                borderRadius: "50%",
                top: "-80px",
                right: "-60px",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "200px",
                height: "200px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "50%",
                bottom: "-40px",
                left: "-40px",
                pointerEvents: "none",
              }}
            />
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 900,
                fontSize: "clamp(26px, 4vw, 46px)",
                letterSpacing: "-1.5px",
                margin: "0 0 14px",
                color: "white",
                lineHeight: 1.1,
                position: "relative",
              }}
            >
              Your love deserves a home.
            </h2>
            <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.85)", margin: "0 0 32px", position: "relative" }}>
              Join couples who chose to stay close, every single day.
            </p>
            <Link
              href="/signup"
              id="bottom-cta-signup"
              className="landing-cta-pill"
              style={{
                display: "inline-block",
                background: "white",
                color: "hsl(14 55% 48%)",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: 700,
                padding: "16px 40px",
                borderRadius: "100px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                position: "relative",
                transition: "transform 0.15s",
              }}
            >
              🏡 Open Tahanan, free
            </Link>
          </div>
        </AnimatedSection>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid hsl(24 15% 87%)",
          padding: "32px clamp(16px, 4vw, 48px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>🏡</span>
          <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "17px", color: "hsl(24 30% 18%)" }}>
            Tahanan
          </span>
        </div>
        <p style={{ fontSize: "13px", color: "hsl(24 15% 55%)", margin: 0 }}>
          © {new Date().getFullYear()} Tahanan. Made with 💛 for couples everywhere.
        </p>
        <div style={{ display: "flex", gap: "20px" }}>
          <Link
            href="/login"
            style={{ fontSize: "13px", color: "hsl(24 15% 50%)", textDecoration: "none" }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            style={{ fontSize: "13px", color: "hsl(14 55% 52%)", textDecoration: "none", fontWeight: 600 }}
          >
            Sign up
          </Link>
        </div>
      </footer>
    </div>
  );
}
