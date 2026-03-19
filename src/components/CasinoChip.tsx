"use client";

import { useRef } from "react";
import { playChipClick } from "@/lib/sound";

interface ChipConfig {
  value: number;
  outerRing: string;
  body: string;
  segments: string;
  textColor: string;
  glow: string;
}

const CHIPS: ChipConfig[] = [
  { value: 1,  outerRing: "#e8e8e8", body: "#ffffff", segments: "#b0b0b0", textColor: "#1a1a1a", glow: "rgba(220,220,220,0.6)" },
  { value: 5,  outerRing: "#c62828", body: "#ef5350", segments: "#b71c1c", textColor: "#ffffff",  glow: "rgba(239,83,80,0.6)"  },
  { value: 10, outerRing: "#1565c0", body: "#2196f3", segments: "#0d47a1", textColor: "#ffffff",  glow: "rgba(33,150,243,0.6)" },
  { value: 25, outerRing: "#2e7d32", body: "#4caf50", segments: "#1b5e20", textColor: "#ffffff",  glow: "rgba(76,175,80,0.6)"  },
];

interface CasinoChipProps {
  value: number;
  onClick: (value: number) => void;
  disabled?: boolean;
}

function ChipSVG({ config }: { config: ChipConfig }) {
  const { outerRing, body, segments, textColor, value } = config;
  const cx = 36;
  const cy = 36;
  const r = 33;
  const innerR = 26;
  const numSegments = 12;

  // Generate segment arcs around the rim
  const segmentPaths: string[] = [];
  for (let i = 0; i < numSegments; i++) {
    const startAngle = (i / numSegments) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((i + 0.55) / numSegments) * 2 * Math.PI - Math.PI / 2;
    const outerRadius = r;
    const segInnerR = innerR + 2;

    const x1 = cx + segInnerR * Math.cos(startAngle);
    const y1 = cy + segInnerR * Math.sin(startAngle);
    const x2 = cx + outerRadius * Math.cos(startAngle);
    const y2 = cy + outerRadius * Math.sin(startAngle);
    const x3 = cx + outerRadius * Math.cos(endAngle);
    const y3 = cy + outerRadius * Math.sin(endAngle);
    const x4 = cx + segInnerR * Math.cos(endAngle);
    const y4 = cy + segInnerR * Math.sin(endAngle);

    segmentPaths.push(
      `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${segInnerR} ${segInnerR} 0 0 0 ${x1} ${y1} Z`
    );
  }

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r} fill={outerRing} />

      {/* Segment patterns (alternating) */}
      {segmentPaths.map((d, i) => (
        <path key={i} d={d} fill={i % 2 === 0 ? segments : outerRing} />
      ))}

      {/* Main body circle */}
      <circle cx={cx} cy={cy} r={innerR} fill={body} />

      {/* Inner decorative ring */}
      <circle cx={cx} cy={cy} r={innerR - 3} fill="none" stroke={outerRing} strokeWidth="1.5" opacity="0.6" />

      {/* Center highlight */}
      <circle cx={cx} cy={cy} r={innerR - 7} fill={outerRing} opacity="0.12" />

      {/* Shine effect */}
      <ellipse cx={cx - 5} cy={cy - 8} rx="8" ry="5" fill="white" opacity="0.18" transform={`rotate(-30 ${cx} ${cy})`} />

      {/* Value text */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={value >= 10 ? "13" : "14"}
        fontWeight="800"
        fontFamily="'Barlow Condensed', sans-serif"
        letterSpacing="0.05em"
      >
        ${value}
      </text>
    </svg>
  );
}

export function CasinoChip({ value, onClick, disabled }: CasinoChipProps) {
  const config = CHIPS.find(c => c.value === value) ?? CHIPS[0];
  const ref = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (disabled) return;
    playChipClick();
    // Bounce animation
    if (ref.current) {
      ref.current.classList.remove("animate-chip-bounce");
      void ref.current.offsetWidth; // reflow
      ref.current.classList.add("animate-chip-bounce");
    }
    onClick(value);
  };

  return (
    <div
      ref={ref}
      className="chip-container"
      onClick={handleClick}
      style={{
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        filter: disabled
          ? "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
          : `drop-shadow(0 4px 10px ${config.glow}) drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
      }}
      title={`Bet $${value}`}
    >
      <ChipSVG config={config} />
    </div>
  );
}

export { CHIPS };
