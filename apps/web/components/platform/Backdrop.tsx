/**
 * Brand background chunks for the Branvelo platform pages: dot grids,
 * the logo's amber speed streaks, the smile arc, and soft rings.
 * Decorative only (aria-hidden, pointer-events-none), always positioned
 * absolutely inside a relative, overflow-hidden section.
 */

export function DotGrid({
  className = "",
  color = "#2C24A3",
  opacity = 0.1,
  drift = false,
}: {
  className?: string;
  color?: string;
  opacity?: number;
  drift?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${drift ? "bv-dots-drift" : ""} ${className}`}
      style={{
        backgroundImage: `radial-gradient(${color} 1.6px, transparent 1.7px)`,
        backgroundSize: "26px 26px",
        opacity,
        maskImage:
          "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at center, black 30%, transparent 75%)",
      }}
    />
  );
}

/** The three amber speed streaks from the logo icon. */
export function SpeedStreaks({
  className = "",
  width = 74,
  slow = false,
  rotate = 0,
}: {
  className?: string;
  width?: number;
  slow?: boolean;
  rotate?: number;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 44"
      width={width}
      className={`pointer-events-none absolute ${slow ? "bv-float-slow" : "bv-float"} ${className}`}
      style={{ ["--bv-rot" as string]: `${rotate}deg` }}
    >
      <path
        d="M8 8 H44 M4 22 H52 M8 36 H44"
        stroke="#F59E0B"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** The smile swoosh from the wordmark, as a large soft arc. */
export function SmileArc({
  className = "",
  width = 300,
  opacity = 0.16,
  slow = true,
}: {
  className?: string;
  width?: number;
  opacity?: number;
  slow?: boolean;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 220 40"
      width={width}
      className={`pointer-events-none absolute ${slow ? "bv-float-slow" : "bv-float"} ${className}`}
      style={{ opacity }}
    >
      <path
        d="M6 6 Q 110 44 206 10"
        stroke="#F59E0B"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M192 5 L209 9 L198 21"
        stroke="#F59E0B"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Soft indigo ring, echoes the wordmark's o. */
export function BrandRing({
  className = "",
  size = 120,
  color = "#3B34C4",
  opacity = 0.12,
  slow = false,
}: {
  className?: string;
  size?: number;
  color?: string;
  opacity?: number;
  slow?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full ${slow ? "bv-float-slow" : "bv-float"} ${className}`}
      style={{
        width: size,
        height: size,
        border: `${Math.max(6, size / 11)}px solid ${color}`,
        opacity,
      }}
    />
  );
}
