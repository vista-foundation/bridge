"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

// ── Deterministic star positions (avoids hydration mismatch) ──────────
const STARS = [
  { x: "3%", y: "7%", s: 1.5, o: 0.25, d: 2.8, dl: 0 },
  { x: "12%", y: "4%", s: 1, o: 0.4, d: 3.5, dl: 1.2 },
  { x: "18%", y: "15%", s: 2, o: 0.2, d: 4.1, dl: 0.5 },
  { x: "25%", y: "8%", s: 1, o: 0.35, d: 2.5, dl: 2.1 },
  { x: "31%", y: "22%", s: 1.5, o: 0.3, d: 3.8, dl: 0.8 },
  { x: "8%", y: "30%", s: 1, o: 0.2, d: 3.2, dl: 1.5 },
  { x: "15%", y: "42%", s: 2, o: 0.15, d: 4.5, dl: 0.3 },
  { x: "22%", y: "55%", s: 1, o: 0.3, d: 2.9, dl: 2.4 },
  { x: "5%", y: "65%", s: 1.5, o: 0.25, d: 3.6, dl: 1.0 },
  { x: "28%", y: "70%", s: 1, o: 0.4, d: 3.0, dl: 0.6 },
  { x: "35%", y: "12%", s: 1, o: 0.2, d: 4.0, dl: 1.8 },
  { x: "42%", y: "5%", s: 2, o: 0.3, d: 2.7, dl: 0.2 },
  { x: "48%", y: "18%", s: 1, o: 0.25, d: 3.4, dl: 2.6 },
  { x: "55%", y: "3%", s: 1.5, o: 0.35, d: 3.1, dl: 0.9 },
  { x: "52%", y: "28%", s: 1, o: 0.2, d: 4.3, dl: 1.4 },
  { x: "60%", y: "10%", s: 1, o: 0.3, d: 2.6, dl: 2.0 },
  { x: "67%", y: "20%", s: 2, o: 0.15, d: 3.9, dl: 0.4 },
  { x: "72%", y: "6%", s: 1, o: 0.4, d: 3.3, dl: 1.7 },
  { x: "78%", y: "16%", s: 1.5, o: 0.25, d: 4.2, dl: 0.1 },
  { x: "85%", y: "9%", s: 1, o: 0.3, d: 2.8, dl: 2.3 },
  { x: "90%", y: "22%", s: 1, o: 0.2, d: 3.7, dl: 1.1 },
  { x: "95%", y: "5%", s: 2, o: 0.35, d: 3.0, dl: 0.7 },
  { x: "38%", y: "35%", s: 1, o: 0.2, d: 4.4, dl: 1.6 },
  { x: "45%", y: "45%", s: 1.5, o: 0.3, d: 2.5, dl: 2.8 },
  { x: "58%", y: "38%", s: 1, o: 0.25, d: 3.6, dl: 0.3 },
  { x: "65%", y: "50%", s: 1, o: 0.15, d: 4.0, dl: 1.9 },
  { x: "73%", y: "42%", s: 2, o: 0.2, d: 3.2, dl: 0.5 },
  { x: "80%", y: "55%", s: 1, o: 0.3, d: 2.9, dl: 2.2 },
  { x: "88%", y: "40%", s: 1.5, o: 0.25, d: 3.8, dl: 1.3 },
  { x: "93%", y: "52%", s: 1, o: 0.35, d: 3.1, dl: 0.8 },
  { x: "10%", y: "80%", s: 1, o: 0.2, d: 4.1, dl: 2.5 },
  { x: "20%", y: "88%", s: 2, o: 0.3, d: 2.7, dl: 0.1 },
  { x: "33%", y: "78%", s: 1, o: 0.25, d: 3.5, dl: 1.4 },
  { x: "40%", y: "85%", s: 1.5, o: 0.15, d: 4.3, dl: 0.6 },
  { x: "50%", y: "75%", s: 1, o: 0.35, d: 2.6, dl: 2.0 },
  { x: "62%", y: "82%", s: 1, o: 0.2, d: 3.9, dl: 0.9 },
  { x: "70%", y: "90%", s: 2, o: 0.3, d: 3.3, dl: 1.7 },
  { x: "82%", y: "78%", s: 1, o: 0.25, d: 4.2, dl: 0.4 },
  { x: "91%", y: "85%", s: 1.5, o: 0.4, d: 2.8, dl: 2.7 },
  { x: "96%", y: "72%", s: 1, o: 0.2, d: 3.4, dl: 1.0 },
  { x: "4%", y: "48%", s: 1, o: 0.3, d: 3.7, dl: 0.2 },
  { x: "16%", y: "58%", s: 1.5, o: 0.2, d: 4.0, dl: 2.1 },
  { x: "37%", y: "62%", s: 1, o: 0.25, d: 2.5, dl: 1.5 },
  { x: "47%", y: "58%", s: 2, o: 0.15, d: 3.6, dl: 0.7 },
  { x: "56%", y: "65%", s: 1, o: 0.35, d: 3.0, dl: 2.4 },
  { x: "75%", y: "68%", s: 1, o: 0.2, d: 4.4, dl: 1.2 },
  { x: "86%", y: "62%", s: 1.5, o: 0.3, d: 2.9, dl: 0.3 },
  { x: "2%", y: "92%", s: 1, o: 0.25, d: 3.2, dl: 1.8 },
  { x: "97%", y: "35%", s: 1, o: 0.3, d: 3.8, dl: 0.5 },
  { x: "44%", y: "92%", s: 2, o: 0.2, d: 4.1, dl: 2.6 },
];

// ── Ellipse ratios for the orbital rings ──────────────────────────────
const INNER_RY_RATIO = 200 / 340; // ≈ 0.588
const OUTER_RY_RATIO = 280 / 440; // ≈ 0.636

interface Props {
  variant?: "full" | "subtle";
}

export default function SolarSystemBackground({ variant = "full" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip scroll listener on mobile
    if (typeof window === "undefined" || window.innerWidth < 768) return;

    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          const el = containerRef.current;
          if (!el) { ticking = false; return; }

          const scrollY = window.scrollY;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const progress = maxScroll > 0 ? scrollY / maxScroll : 0;

          el.style.setProperty("--sp", String(progress));
          el.style.setProperty("--sy", String(scrollY));
          ticking = false;
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initial position

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none z-0 hidden md:block"
      style={{ "--sp": "0", "--sy": "0" } as React.CSSProperties}
    >
      {/* ── Star field ──────────────────────────────────────────── */}
      {STARS.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white star-twinkle"
          style={{
            left: star.x,
            top: star.y,
            width: star.s,
            height: star.s,
            "--star-opacity": String(star.o),
            "--twinkle-duration": `${star.d}s`,
            "--twinkle-delay": `${star.dl}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Orbital system ──────────────────────────────────────── */}
      <div className="absolute left-1/2 top-[80px] -translate-x-1/2 w-[900px] h-[900px]">
        {/* Static orbital ring SVGs */}
        <div className="absolute inset-0 opacity-[0.15]">
          <svg viewBox="0 0 900 900" fill="none" className="w-full h-full">
            <ellipse cx="450" cy="450" rx="440" ry="280" stroke="#555" strokeWidth="0.5" />
            <ellipse cx="450" cy="450" rx="340" ry="200" stroke="#444" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Inner orbit — accent planet */}
        <div
          className="absolute left-1/2 top-1/2 w-0 h-0"
          style={{
            transform: `translate(-50%, -50%) rotate(calc(var(--sp) * 360deg)) scaleY(${INNER_RY_RATIO})`,
            willChange: "transform",
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: 14,
              height: 14,
              left: -340 - 7,
              top: -7,
              background: "radial-gradient(circle at 35% 35%, #f85858, #a03030)",
              boxShadow: "0 0 12px 3px rgba(248, 88, 88, 0.3)",
              transform: `scaleY(${1 / INNER_RY_RATIO}) rotate(calc(var(--sp) * -360deg))`,
              willChange: "transform",
            }}
          />
        </div>

        {/* Outer orbit — gray planet */}
        <div
          className="absolute left-1/2 top-1/2 w-0 h-0"
          style={{
            transform: `translate(-50%, -50%) rotate(calc(var(--sp) * -200deg + 45deg)) scaleY(${OUTER_RY_RATIO})`,
            willChange: "transform",
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: 10,
              height: 10,
              left: -440 - 5,
              top: -5,
              background: "radial-gradient(circle at 35% 35%, #888, #444)",
              boxShadow: "0 0 8px 2px rgba(136, 136, 136, 0.2)",
              transform: `scaleY(${1 / OUTER_RY_RATIO}) rotate(calc(var(--sp) * 200deg - 45deg))`,
              willChange: "transform",
            }}
          />
        </div>
      </div>

      {/* ── Full variant: Moon + Asteroids with parallax ─────── */}
      {variant === "full" && (
        <>
          {/* Moon — subtle parallax drift */}
          <div
            className="absolute left-1/2 w-[650px] h-[520px]"
            style={{
              bottom: -120,
              transform: "translateX(-50%) translateY(calc(var(--sy) * 0.15px))",
            }}
          >
            <Image
              src="/assets/home/moon.png"
              alt=""
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Asteroid left — drifts up */}
          <div
            className="absolute w-[240px] h-[225px]"
            style={{
              left: -40,
              top: -30,
              transform: "translateY(calc(var(--sy) * -0.08px))",
            }}
          >
            <Image
              src="/assets/home/asteroid-left.png"
              alt=""
              fill
              className="object-cover"
            />
          </div>

          {/* Asteroid right — drifts down */}
          <div
            className="absolute w-[240px] h-[225px]"
            style={{
              right: -40,
              bottom: 40,
              transform: "translateY(calc(var(--sy) * 0.12px))",
            }}
          >
            <Image
              src="/assets/home/asteroid-right.png"
              alt=""
              fill
              className="object-cover"
            />
          </div>
        </>
      )}
    </div>
  );
}
