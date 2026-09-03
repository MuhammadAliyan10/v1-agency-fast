// components/ui/splash-screen.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "exit">("visible");
  const [mounted, setMounted] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  useEffect(() => {
    // Only show once per browser session
    const shown = sessionStorage.getItem("cc-splash-shown");
    if (shown) {
      setIsRemoved(true);
      return;
    }

    setMounted(true);
    sessionStorage.setItem("cc-splash-shown", "1");

    // Step 1: icon enters at 0ms (via CSS)
    // Step 2: text enters at 600ms (via CSS)
    // Step 3: start fade-out at 2200ms
    const exitTimer = setTimeout(() => setPhase("exit"), 2200);
    // Step 4: remove from DOM at 2900ms (after fade)
    const removeTimer = setTimeout(() => setIsRemoved(true), 2900);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (isRemoved || !mounted) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f0d0b",
        animation: phase === "exit" ? "splashFadeOut 0.7s ease-out forwards" : undefined,
        pointerEvents: "all",
      }}
    >
      <style>{`
        @keyframes splashFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }

        @keyframes logoReveal {
          0%   { opacity: 0; transform: scale(0.6); }
          60%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes textSlideIn {
          0%   { opacity: 0; transform: translateX(40px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @keyframes lineExpand {
          0%   { width: 0; opacity: 0; }
          100% { width: 100%; opacity: 1; }
        }

        @keyframes taglineReveal {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .splash-logo {
          animation: logoReveal 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0ms both;
        }

        .splash-text-wrapper {
          animation: textSlideIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both;
        }

        .splash-divider {
          animation: lineExpand 0.5s ease-out 0.8s both;
        }

        .splash-tagline {
          animation: taglineReveal 0.5s ease-out 1s both;
        }
      `}</style>

      {/* Ambient glow behind the logo */}
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.72 0.14 52 / 0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          position: "relative",
        }}
      >
        {/* Logo Icon */}
        <div className="splash-logo" style={{ flexShrink: 0 }}>
          <Image
            src="/logo.png"
            alt="Classy Crave"
            width={72}
            height={72}
            priority
            style={{
              borderRadius: 16,
              objectFit: "cover",
              boxShadow: "0 0 40px oklch(0.72 0.14 52 / 0.35)",
            }}
          />
        </div>

        {/* Text block slides in from the right */}
        <div className="splash-text-wrapper">
          {/* Brand name */}
          <p
            style={{
              fontFamily: "var(--font-heading), Georgia, serif",
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 600,
              color: "#F5F2EB",
              margin: 0,
              lineHeight: 1,
              letterSpacing: "0.02em",
            }}
          >
            Classy Crave
          </p>

          {/* Amber divider line */}
          <div
            className="splash-divider"
            style={{
              height: 1,
              margin: "8px 0",
              background: "oklch(0.72 0.14 52)",
              borderRadius: 1,
            }}
          />

          {/* Tagline */}
          <p
            className="splash-tagline"
            style={{
              fontFamily: "var(--font-sans), system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 400,
              color: "oklch(0.68 0.02 70)",
              margin: 0,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Premium Fast Food · Sillanwali
          </p>
        </div>
      </div>
    </div>
  );
}
