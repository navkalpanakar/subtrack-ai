"use client";

// Savvy — the AI mascot for SubTrack AI. A friendly rounded spark/blob
// character with eyes. Used across login, dashboard tips, insights, rewards.
// Variants: idle (still), happy (smiling), excited (celebrating).

export function SavvyMascot({
  size = 64,
  variant = "idle",
  className = "",
}: {
  size?: number;
  variant?: "idle" | "happy" | "excited" | "wink";
  className?: string;
}) {
  const mouth =
    variant === "excited"
      ? "M38 52 Q50 64 62 52" // big open smile
      : variant === "happy"
      ? "M40 52 Q50 60 60 52" // smile
      : variant === "wink"
      ? "M40 52 Q50 58 60 52" // small smile
      : "M42 53 Q50 57 58 53"; // neutral gentle

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-label="Savvy AI mascot"
    >
      <defs>
        <linearGradient id="savvy-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <radialGradient id="savvy-glow" cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#a7f3d0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#a7f3d0" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* glow */}
      <circle cx="50" cy="48" r="44" fill="url(#savvy-glow)" />
      {/* body — rounded blob */}
      <path
        d="M50 14c-18 0-32 13-32 30 0 9 4 16 11 21-1 5-3 12-3 12s8-4 13-8c3 1 7 2 11 2 18 0 32-13 32-30S68 14 50 14z"
        fill="url(#savvy-body)"
      />
      {/* shine */}
      <ellipse cx="40" cy="34" rx="8" ry="5" fill="#ffffff" opacity="0.35" />
      {/* eyes */}
      {variant === "wink" ? (
        <>
          <circle cx="42" cy="44" r="3.5" fill="#06281f" />
          <path d="M54 44 q4 -3 8 0" stroke="#06281f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="42" cy="44" r="3.8" fill="#06281f" />
          <circle cx="58" cy="44" r="3.8" fill="#06281f" />
          <circle cx="43.2" cy="42.8" r="1.2" fill="#ffffff" />
          <circle cx="59.2" cy="42.8" r="1.2" fill="#ffffff" />
        </>
      )}
      {/* mouth */}
      <path d={mouth} stroke="#06281f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* antenna spark */}
      <line x1="50" y1="14" x2="50" y2="7" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="5" r="2.5" fill="#fbbf24" />
    </svg>
  );
}
