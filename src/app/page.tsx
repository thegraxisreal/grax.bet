"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLiveEvents } from "@/context/LiveEventsContext";

// ── Game card illustrations ───────────────────────────────────────────────────

function BlackjackArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <filter id="bj-shadow">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.5)" />
        </filter>
        <radialGradient id="bj-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,200,50,0.3)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      {/* Glow */}
      <ellipse cx="100" cy="80" rx="70" ry="55" fill="url(#bj-glow)" />
      {/* Back card — rotated left */}
      <g transform="rotate(-14 100 75)" filter="url(#bj-shadow)">
        <rect x="35" y="18" width="65" height="90" rx="7" fill="#1a4a8a" />
        <rect x="39" y="22" width="57" height="82" rx="5" fill="none" stroke="#2563eb" strokeWidth="1.5" />
        <line x1="39" y1="22" x2="96" y2="104" stroke="#1d4ed8" strokeWidth="0.5" opacity="0.4" />
        <line x1="96" y1="22" x2="39" y2="104" stroke="#1d4ed8" strokeWidth="0.5" opacity="0.4" />
        <text x="67" y="68" textAnchor="middle" dominantBaseline="middle" fontSize="22" fill="#60a5fa" fontFamily="Georgia, serif" fontWeight="bold">♦</text>
      </g>
      {/* Middle card — K♥ */}
      <g transform="rotate(7 110 75)" filter="url(#bj-shadow)">
        <rect x="60" y="12" width="70" height="96" rx="7" fill="white" />
        <text x="68" y="32" fontSize="14" fontWeight="bold" fill="#1a1a1a" fontFamily="'Barlow Condensed',sans-serif">K</text>
        <text x="68" y="48" fontSize="13" fill="#dc2626">♥</text>
        <text x="95" y="72" textAnchor="middle" dominantBaseline="middle" fontSize="34" fill="#dc2626">♥</text>
        <text x="122" y="98" textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="#1a1a1a" transform="rotate(180 122 98)">K</text>
        <text x="122" y="82" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#dc2626" transform="rotate(180 122 82)">♥</text>
      </g>
      {/* Front card — A♠ */}
      <g filter="url(#bj-shadow)">
        <rect x="100" y="8" width="70" height="96" rx="7" fill="white" />
        <text x="108" y="28" fontSize="16" fontWeight="bold" fill="#1a1a1a" fontFamily="'Barlow Condensed',sans-serif">A</text>
        <text x="108" y="44" fontSize="13" fill="#1a1a1a">♠</text>
        <text x="135" y="62" textAnchor="middle" dominantBaseline="middle" fontSize="38" fill="#1a1a1a">♠</text>
        <text x="162" y="94" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="#1a1a1a" transform="rotate(180 162 94)">A</text>
        <text x="162" y="78" textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="#1a1a1a" transform="rotate(180 162 78)">♠</text>
      </g>
      {/* "21" badge */}
      <g>
        <circle cx="34" cy="120" r="16" fill="#f59e0b" />
        <text x="34" y="120" textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="800" fill="white" fontFamily="'Barlow Condensed',sans-serif" letterSpacing="-1">21</text>
      </g>
    </svg>
  );
}

function MinesArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="gem-glow" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(147,210,255,0.5)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id="gem-body" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#a5f3fb" />
          <stop offset="40%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <filter id="mines-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <ellipse cx="75" cy="80" rx="55" ry="45" fill="url(#gem-glow)" />
      {/* Large diamond gem */}
      <g filter="url(#mines-glow)">
        <polygon points="75,8 120,48 75,108 30,48" fill="url(#gem-body)" />
        <polygon points="75,8 120,48 75,48" fill="rgba(255,255,255,0.30)" />
        <polygon points="75,8 30,48 75,48" fill="rgba(255,255,255,0.14)" />
        <line x1="30" y1="48" x2="120" y2="48" stroke="rgba(255,255,255,0.38)" strokeWidth="0.9" />
        <ellipse cx="58" cy="30" rx="9" ry="5" fill="rgba(255,255,255,0.60)" transform="rotate(-25 58 30)" />
        <circle cx="96" cy="58" r="2.5" fill="rgba(255,255,255,0.45)" />
      </g>
      {/* Bomb */}
      <g transform="translate(128, 62)">
        {/* Spikes */}
        {Array.from({length:8},(_,i)=>{
          const a = (i/8)*Math.PI*2;
          return <line key={i} x1={10+8*Math.cos(a)} y1={10+8*Math.sin(a)} x2={10+14*Math.cos(a)} y2={10+14*Math.sin(a)} stroke="#374151" strokeWidth="2.8" strokeLinecap="round"/>;
        })}
        <circle cx="10" cy="10" r="11" fill="#1f2937" />
        <circle cx="10" cy="10" r="11" fill="none" stroke="#374151" strokeWidth="1" />
        <ellipse cx="5" cy="5" rx="3.5" ry="2" fill="rgba(255,255,255,0.22)" transform="rotate(-35 5 5)" />
        {/* Fuse */}
        <path d="M10 -1 Q18 -8 14 -16" stroke="#92400e" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Flame */}
        <ellipse cx="14" cy="-17" rx="3" ry="4.5" fill="#f97316" />
        <ellipse cx="14" cy="-18" rx="1.8" ry="3" fill="#fcd34d" />
        <circle cx="14" cy="-17" r="3.5" fill="rgba(249,115,22,0.3)" />
      </g>
      {/* Small gems scattered */}
      <g transform="translate(138, 18) scale(0.45)">
        <polygon points="18,0 36,14 18,36 0,14" fill="#34d399" opacity="0.85" />
        <polygon points="18,0 36,14 18,14" fill="rgba(255,255,255,0.3)" />
      </g>
      <g transform="translate(22, 95) scale(0.35)">
        <polygon points="18,0 36,14 18,36 0,14" fill="#a78bfa" opacity="0.75" />
        <polygon points="18,0 36,14 18,14" fill="rgba(255,255,255,0.3)" />
      </g>
    </svg>
  );
}

function RouletteArt() {
  const pocketColors = [
    "#16a34a","#dc2626","#1a1a1a","#dc2626","#1a1a1a","#dc2626","#1a1a1a","#dc2626",
    "#1a1a1a","#dc2626","#1a1a1a","#dc2626","#1a1a1a","#dc2626","#1a1a1a","#dc2626",
    "#1a1a1a","#dc2626","#1a1a1a",
  ];
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="rl-rim" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="60%" stopColor="#b8960c" />
          <stop offset="100%" stopColor="#5c4a08" />
        </radialGradient>
        <radialGradient id="rl-hub" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#e0c060" />
          <stop offset="100%" stopColor="#5c4a08" />
        </radialGradient>
        <filter id="rl-shadow">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="rgba(0,0,0,0.6)" />
        </filter>
      </defs>
      <g filter="url(#rl-shadow)">
        {/* Metallic rim */}
        <circle cx="100" cy="78" r="65" fill="url(#rl-rim)" />
        <circle cx="100" cy="78" r="61" fill="#0d0d0d" />
        {/* Pockets */}
        {pocketColors.map((col, i) => {
          const total = 19;
          const start = (i / total) * 2 * Math.PI - Math.PI / 2;
          const end = ((i + 1) / total) * 2 * Math.PI - Math.PI / 2;
          const R = 60; const r2 = 36;
          const x1=100+R*Math.cos(start), y1=78+R*Math.sin(start);
          const x2=100+R*Math.cos(end), y2=78+R*Math.sin(end);
          const x3=100+r2*Math.cos(end), y3=78+r2*Math.sin(end);
          const x4=100+r2*Math.cos(start), y4=78+r2*Math.sin(start);
          return <path key={i} d={`M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r2} ${r2} 0 0 0 ${x4} ${y4}Z`} fill={col} stroke="rgba(180,150,10,0.5)" strokeWidth="0.7" />;
        })}
        {/* Dividers */}
        {pocketColors.map((_, i) => {
          const total = 19;
          const a = (i / total) * 2 * Math.PI - Math.PI / 2;
          return <line key={i} x1={100+36*Math.cos(a)} y1={78+36*Math.sin(a)} x2={100+60*Math.cos(a)} y2={78+60*Math.sin(a)} stroke="rgba(212,175,55,0.7)" strokeWidth="1.1" />;
        })}
        {/* Inner rings */}
        <circle cx="100" cy="78" r="35" fill="#141414" />
        <circle cx="100" cy="78" r="34" fill="none" stroke="rgba(180,150,10,0.7)" strokeWidth="1.5" />
        {/* Spokes */}
        {[0,45,90,135,180,225,270,315].map((a,i)=>{
          const rad=a*Math.PI/180;
          return <line key={i} x1={100+16*Math.cos(rad)} y1={78+16*Math.sin(rad)} x2={100+33*Math.cos(rad)} y2={78+33*Math.sin(rad)} stroke="rgba(180,150,10,0.3)" strokeWidth="0.8" />;
        })}
        {/* Hub */}
        <circle cx="100" cy="78" r="16" fill="url(#rl-hub)" />
        <circle cx="100" cy="78" r="7" fill="rgba(0,0,0,0.5)" />
        <ellipse cx="95" cy="73" rx="4" ry="2.5" fill="rgba(255,255,255,0.25)" transform="rotate(-30 95 73)" />
      </g>
      {/* Ball */}
      <circle cx="100" cy="19" r="5.5" fill="white" />
      <circle cx="98" cy="17" r="2" fill="rgba(255,255,255,0.8)" />
      {/* Gold indicator arrow */}
      <polygon points="100,10 104,2 96,2" fill="#f0b429" />
    </svg>
  );
}


function GolfArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <rect x="15" y="15" width="170" height="120" rx="16" fill="#14532d" />
      <rect x="28" y="28" width="144" height="94" rx="12" fill="#166534" />
      <rect x="68" y="66" width="64" height="16" rx="6" fill="#0f3f22" />
      <circle cx="57" cy="98" r="8" fill="#f8fafc" />
      <circle cx="147" cy="48" r="7" fill="#111827" />
      <rect x="152" y="24" width="3" height="24" fill="#e2e8f0" />
      <polygon points="155,24 170,30 155,36" fill="#ef4444" />
      <rect x="90" y="42" width="18" height="18" fill="#6b7280" />
      <circle cx="118" cy="96" r="9" fill="#6b7280" />
    </svg>
  );
}

function SlotsArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="slots-machine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0d1f36" />
        </linearGradient>
        <linearGradient id="slots-reel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2a3a" />
          <stop offset="100%" stopColor="#0a1520" />
        </linearGradient>
        <filter id="slot-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Machine body */}
      <rect x="18" y="22" width="164" height="110" rx="12" fill="url(#slots-machine)" stroke="rgba(100,150,255,0.3)" strokeWidth="1.5" />
      {/* Top light strip */}
      <rect x="18" y="22" width="164" height="8" rx="8" fill="rgba(99,179,255,0.15)" />
      {[30,55,80,105,130,155,168].map((x,i)=>(
        <circle key={i} cx={x} cy="26" r="2.5" fill={`hsl(${200+i*20},80%,65%)`} opacity="0.8" />
      ))}
      {/* Three reel windows */}
      {[0,1,2].map(i => {
        const x = 28 + i * 52;
        return (
          <g key={i}>
            <rect x={x} y="38" width="44" height="62" rx="6" fill="url(#slots-reel)" stroke="rgba(255,215,0,0.5)" strokeWidth="1.5" />
            {/* Win line glow */}
            <rect x={x} y="38" width="44" height="62" rx="6" fill="rgba(255,215,0,0.05)" />
            {/* 7 symbol */}
            <text x={x+22} y="79" textAnchor="middle" dominantBaseline="middle" fontSize="32" fontWeight="900" fill="#f59e0b" fontFamily="'Barlow Condensed',sans-serif" filter="url(#slot-glow)">7</text>
            {/* Above and below reel symbols (blurred, suggesting spinning) */}
            <text x={x+22} y="48" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="rgba(239,68,68,0.4)" fontFamily="Georgia">♥</text>
            <text x={x+22} y="95" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="rgba(59,130,246,0.4)" fontFamily="Georgia">♣</text>
          </g>
        );
      })}
      {/* Win line */}
      <line x1="22" y1="69" x2="178" y2="69" stroke="rgba(255,215,0,0.6)" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* JACKPOT text */}
      <text x="100" y="118" textAnchor="middle" fontSize="13" fontWeight="800" fill="#f59e0b" fontFamily="'Barlow Condensed',sans-serif" letterSpacing="0.15em">JACKPOT</text>
      {/* Coins flying out */}
      {[[165,55,0.9],[172,75,0.7],[158,90,0.8]].map(([cx,cy,op],i)=>(
        <g key={i}>
          <circle cx={cx} cy={cy} r={5} fill="#f59e0b" opacity={op as number} />
          <circle cx={cx} cy={cy} r={5} fill="none" stroke="#fcd34d" strokeWidth="0.8" opacity={op as number} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="5" fill="#92400e" fontWeight="bold">$</text>
        </g>
      ))}
    </svg>
  );
}

function CrashArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="crash-line" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="1" />
        </linearGradient>
        <filter id="crash-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Grid lines */}
      {[30,60,90,120].map(y => <line key={y} x1="20" y1={y} x2="185" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />)}
      {[50,90,130,170].map(x => <line key={x} x1={x} y1="10" x2={x} y2="135" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />)}
      {/* Growth curve fill */}
      <path d="M20 125 Q40 120 60 108 Q90 88 110 65 Q135 38 155 20 L155 135 Z" fill="rgba(34,197,94,0.12)" />
      {/* Growth curve line */}
      <path d="M20 125 Q40 120 60 108 Q90 88 110 65 Q135 38 155 20" stroke="url(#crash-line)" strokeWidth="2.5" strokeLinecap="round" filter="url(#crash-glow)" />
      {/* Rocket at curve tip */}
      <g transform="translate(148, 14) rotate(-45)">
        {/* Body */}
        <ellipse cx="0" cy="0" rx="6" ry="13" fill="#e2e8f0" />
        <polygon points="0,-13 -6,0 6,0" fill="#dc2626" />
        {/* Window */}
        <circle cx="0" cy="-2" r="3" fill="#60a5fa" />
        <circle cx="0" cy="-2" r="3" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
        {/* Fins */}
        <polygon points="-6,8 -12,13 -6,13" fill="#94a3b8" />
        <polygon points="6,8 12,13 6,13" fill="#94a3b8" />
        {/* Flame */}
        <ellipse cx="0" cy="16" rx="4" ry="7" fill="#f97316" opacity="0.9" />
        <ellipse cx="0" cy="15" rx="2.5" ry="5" fill="#fbbf24" />
        <ellipse cx="0" cy="16" rx="4" ry="7" fill="rgba(249,115,22,0.4)" />
      </g>
      {/* Multiplier badges */}
      <g>
        <rect x="14" y="14" width="42" height="20" rx="5" fill="rgba(34,197,94,0.2)" stroke="rgba(34,197,94,0.5)" strokeWidth="1" />
        <text x="35" y="24" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="800" fill="#22c55e" fontFamily="'Barlow Condensed',sans-serif">x100</text>
      </g>
      <g>
        <rect x="62" y="38" width="42" height="20" rx="5" fill="rgba(234,179,8,0.2)" stroke="rgba(234,179,8,0.5)" strokeWidth="1" />
        <text x="83" y="48" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="800" fill="#eab308" fontFamily="'Barlow Condensed',sans-serif">x10.5</text>
      </g>
      {/* Crash explosion hint */}
      {[[170,25],[180,38],[175,50]].map(([x,y],i)=>(
        <line key={i} x1={162} y1={22} x2={x} y2={y} stroke="#ef4444" strokeWidth={2-i*0.4} strokeLinecap="round" opacity={0.7-i*0.15} />
      ))}
    </svg>
  );
}

function SportsArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="ball-grad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#9a3412" />
        </radialGradient>
        <filter id="sports-glow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Court lines background */}
      <g opacity="0.12">
        <rect x="30" y="20" width="140" height="110" rx="4" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="100" cy="75" r="25" stroke="white" strokeWidth="1" fill="none"/>
        <line x1="100" y1="20" x2="100" y2="130" stroke="white" strokeWidth="1"/>
      </g>
      {/* Bounce shadow */}
      <ellipse cx="100" cy="130" rx="30" ry="6" fill="rgba(249,115,22,0.15)" />
      {/* Basketball */}
      <g filter="url(#sports-glow)">
        <circle cx="100" cy="75" r="40" fill="url(#ball-grad)" />
        {/* Ball texture - pebble dots */}
        {[
          [88,58],[95,62],[108,60],[115,68],[85,72],[112,78],
          [90,85],[105,90],[95,95],[110,95],[88,100],[100,68],
        ].map(([x,y],i)=>(
          <circle key={`d${i}`} cx={x} cy={y} r="1.2" fill="rgba(0,0,0,0.15)" />
        ))}
        {/* Horizontal seam */}
        <path d="M60 75 Q80 60 100 60 Q120 60 140 75" stroke="#1a0a00" strokeWidth="1.8" fill="none" opacity="0.6"/>
        <path d="M60 75 Q80 90 100 90 Q120 90 140 75" stroke="#1a0a00" strokeWidth="1.8" fill="none" opacity="0.6"/>
        {/* Vertical seam */}
        <line x1="100" y1="35" x2="100" y2="115" stroke="#1a0a00" strokeWidth="1.8" opacity="0.6"/>
        {/* Side seams */}
        <path d="M78 42 Q72 55 72 75 Q72 95 78 108" stroke="#1a0a00" strokeWidth="1.2" fill="none" opacity="0.4"/>
        <path d="M122 42 Q128 55 128 75 Q128 95 122 108" stroke="#1a0a00" strokeWidth="1.2" fill="none" opacity="0.4"/>
        {/* Shine */}
        <ellipse cx="86" cy="58" rx="12" ry="8" fill="rgba(255,255,255,0.3)" transform="rotate(-30 86 58)" />
      </g>
      {/* Bracket badge */}
      <g>
        <rect x="10" y="10" width="60" height="28" rx="6" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <text x="40" y="19" textAnchor="middle" fontSize="6.5" fontWeight="600" fill="rgba(255,255,255,0.5)" fontFamily="'Barlow Condensed',sans-serif" letterSpacing="0.1em">MARCH</text>
        <text x="40" y="32" textAnchor="middle" fontSize="11" fontWeight="800" fill="white" fontFamily="'Barlow Condensed',sans-serif" letterSpacing="0.05em">MADNESS</text>
      </g>
      {/* Live indicator */}
      <g>
        <circle cx="170" cy="22" r="4" fill="#ef4444" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <text x="170" y="34" textAnchor="middle" fontSize="6" fontWeight="700" fill="#ef4444" fontFamily="'Barlow Condensed',sans-serif" letterSpacing="0.1em">LIVE</text>
      </g>
    </svg>
  );
}

function PlinkoArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="plinko-ball" cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
        <filter id="plinko-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Peg grid — 6 rows */}
      {[0,1,2,3,4,5].map(row => {
        const cols = row + 3;
        const startX = 100 - (cols - 1) * 18;
        return Array.from({length:cols}).map((_,col)=>{
          const x = startX + col * 36;
          const y = 15 + row * 20;
          const isOnPath = (row===0&&col===1)||(row===1&&col===2)||(row===2&&col===2)||(row===3&&col===3)||(row===4&&col===3);
          return (
            <g key={`${row}-${col}`}>
              <circle cx={x} cy={y} r={4.5} fill={isOnPath?"rgba(251,191,36,0.4)":"rgba(255,255,255,0.15)"} />
              <circle cx={x} cy={y} r={3.5} fill={isOnPath?"#fbbf24":"#475569"} />
              {isOnPath && <circle cx={x} cy={y} r={5} fill="rgba(251,191,36,0.2)" filter="url(#plinko-glow)" />}
            </g>
          );
        });
      })}
      {/* Ball falling */}
      <circle cx="136" cy="88" r="8" fill="url(#plinko-ball)" filter="url(#plinko-glow)" />
      <circle cx="133" cy="85" r="3" fill="rgba(255,255,255,0.5)" />
      {/* Ball trail */}
      {[[100,5],[118,25],[118,45],[136,65]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={3-i*0.3} fill="rgba(251,191,36,0.2)" />
      ))}
      {/* Prize buckets */}
      {[
        {x:14, w:24, color:"#3b82f6", label:"x0.5"},
        {x:42, w:24, color:"#8b5cf6", label:"x1"},
        {x:70, w:24, color:"#22c55e", label:"x3"},
        {x:98, w:24, color:"#f59e0b", label:"x10"},
        {x:126,w:24, color:"#ef4444", label:"x50"},
        {x:154,w:24, color:"#8b5cf6", label:"x3"},
        {x:180,w:16, color:"#3b82f6", label:"x1"},
      ].map(({x,w,color,label},i)=>(
        <g key={i}>
          <rect x={x} y="128" width={w} height="18" rx="3" fill={color} opacity="0.85" />
          <text x={x+w/2} y="137" textAnchor="middle" dominantBaseline="middle" fontSize="7" fontWeight="800" fill="white" fontFamily="'Barlow Condensed',sans-serif">{label}</text>
        </g>
      ))}
    </svg>
  );
}

function PlinkoIIArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="pl2-bg-glow" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="rgba(56,189,248,0.45)" />
          <stop offset="45%" stopColor="rgba(168,85,247,0.25)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id="pl2-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="pl2-ball" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <filter id="pl2-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="14" y="12" width="172" height="124" rx="18" fill="rgba(6,12,24,0.72)" />
      <rect x="14" y="12" width="172" height="124" rx="18" stroke="url(#pl2-frame)" strokeWidth="1.5" />
      <ellipse cx="100" cy="56" rx="66" ry="38" fill="url(#pl2-bg-glow)" />

      {Array.from({ length: 6 }).map((_, row) => {
        const cols = row + 4;
        const startX = 100 - ((cols - 1) * 14);
        return Array.from({ length: cols }).map((__, col) => {
          const x = startX + col * 28;
          const y = 32 + row * 13;
          const highlight = row >= 3 && (col === 1 || col === cols - 2);
          return (
            <g key={`${row}-${col}`}>
              <circle cx={x} cy={y} r="4.2" fill={highlight ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"} />
              <circle cx={x} cy={y} r="3.1" fill={highlight ? "#67e8f9" : "#475569"} />
            </g>
          );
        });
      })}

      <path
        d="M98 18 C112 32 128 44 138 60 C146 74 144 90 128 102"
        stroke="rgba(103,232,249,0.55)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="5 7"
      />

      <circle cx="104" cy="26" r="8" fill="url(#pl2-ball)" filter="url(#pl2-glow)" />
      <circle cx="101" cy="23" r="2.4" fill="rgba(255,255,255,0.55)" />

      {[
        { x: 24, w: 20, color: "#0ea5e9", label: "2x" },
        { x: 46, w: 20, color: "#14b8a6", label: "4x" },
        { x: 68, w: 22, color: "#22c55e", label: "8x" },
        { x: 92, w: 22, color: "#f59e0b", label: "16x" },
        { x: 116, w: 22, color: "#ef4444", label: "32x" },
        { x: 140, w: 20, color: "#a855f7", label: "8x" },
        { x: 162, w: 14, color: "#0ea5e9", label: "4x" },
      ].map((bucket) => (
        <g key={bucket.x}>
          <rect x={bucket.x} y="112" width={bucket.w} height="18" rx="4" fill={bucket.color} opacity="0.92" />
          <text
            x={bucket.x + bucket.w / 2}
            y="123"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="7"
            fontWeight="900"
            fill="white"
            fontFamily="'Barlow Condensed',sans-serif"
          >
            {bucket.label}
          </text>
        </g>
      ))}

      <g filter="url(#pl2-glow)">
        <text
          x="26"
          y="30"
          fontSize="22"
          fontWeight="900"
          fill="white"
          fontFamily="'Barlow Condensed',sans-serif"
          letterSpacing="0.12em"
        >
          PLINKO II
        </text>
      </g>
      <text
        x="28"
        y="46"
        fontSize="8"
        fontWeight="700"
        fill="rgba(255,255,255,0.65)"
        fontFamily="'Barlow Condensed',sans-serif"
        letterSpacing="0.2em"
      >
        HYPERDROP MODE
      </text>

      <g transform="translate(98 66)">
        <rect x="-42" y="0" width="84" height="18" rx="9" fill="rgba(15,23,42,0.82)" stroke="rgba(103,232,249,0.4)" />
        <text
          x="0"
          y="11"
          textAnchor="middle"
          fontSize="8"
          fontWeight="800"
          fill="#67e8f9"
          fontFamily="'Barlow Condensed',sans-serif"
          letterSpacing="0.16em"
        >
          COMING SOON
        </text>
      </g>
    </svg>
  );
}

function HorseRacingArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="track-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2d5a1b" />
          <stop offset="100%" stopColor="#1a3a0f" />
        </linearGradient>
        <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a5c" />
          <stop offset="100%" stopColor="#2a5280" />
        </linearGradient>
        <filter id="horse-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="200" height="85" fill="url(#sky-grad)" />

      {/* Track */}
      <rect x="0" y="85" width="200" height="65" fill="url(#track-grad)" />
      {/* Track rail lines */}
      <line x1="0" y1="90" x2="200" y2="90" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1="0" y1="120" x2="200" y2="120" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

      {/* Finish post */}
      <rect x="168" y="72" width="4" height="50" rx="1" fill="#e2e8f0" />
      <rect x="166" y="72" width="22" height="6" rx="2">
        <animate attributeName="fill" values="#ef4444;#ffffff;#ef4444" dur="1s" repeatCount="indefinite" />
      </rect>
      <text x="178" y="68" textAnchor="middle" fontSize="5.5" fill="rgba(255,255,255,0.5)" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700">FINISH</text>

      {/* Crowd dots in background */}
      {[20,35,50,65,80,100,115,130,145].map((x,i) => (
        <circle key={i} cx={x} cy={75 + (i % 3) * 4} r="3.5" fill={`hsl(${200+i*20},40%,55%)`} opacity="0.5" />
      ))}

      {/* Horse 1 — leading (chestnut) */}
      <g transform="translate(95, 88)">
        {/* Shadow */}
        <ellipse cx="18" cy="26" rx="22" ry="4" fill="rgba(0,0,0,0.3)" />
        {/* Body */}
        <ellipse cx="18" cy="14" rx="20" ry="10" fill="#8b4513" />
        {/* Neck */}
        <ellipse cx="32" cy="8" rx="6" ry="9" fill="#8b4513" transform="rotate(-20 32 8)" />
        {/* Head */}
        <ellipse cx="38" cy="2" rx="7" ry="5" fill="#8b4513" transform="rotate(-10 38 2)" />
        {/* Eye */}
        <circle cx="40" cy="0" r="1.5" fill="#1a0a00" />
        <circle cx="40.5" cy="-0.5" r="0.5" fill="rgba(255,255,255,0.6)" />
        {/* Nostril */}
        <ellipse cx="44" cy="3" rx="1.5" ry="1" fill="#5c2a08" />
        {/* Mane */}
        <path d="M30 2 Q28 -4 26 -2 Q24 -6 22 -3 Q20 -5 18 -2" stroke="#3d1a08" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Legs — galloping pose */}
        <line x1="8" y1="22" x2="2" y2="34" stroke="#6b3410" strokeWidth="3" strokeLinecap="round" />
        <line x1="14" y1="23" x2="18" y2="35" stroke="#6b3410" strokeWidth="3" strokeLinecap="round" />
        <line x1="24" y1="23" x2="12" y2="33" stroke="#6b3410" strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1="22" x2="36" y2="32" stroke="#6b3410" strokeWidth="3" strokeLinecap="round" />
        {/* Tail */}
        <path d="M0 14 Q-8 10 -6 18 Q-12 16 -8 24" stroke="#5c2a08" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Jockey */}
        <ellipse cx="16" cy="4" rx="6" ry="7" fill="#ef4444" />
        <circle cx="16" cy="-4" r="5" fill="#fbbf24" />
        {/* Jockey helmet */}
        <ellipse cx="16" cy="-7" rx="5.5" ry="3" fill="#ef4444" />
        {/* Number bib */}
        <text x="16" y="6" textAnchor="middle" fontSize="6" fontWeight="900" fill="white" fontFamily="'Barlow Condensed',sans-serif">1</text>
      </g>

      {/* Horse 2 — trailing (grey) */}
      <g transform="translate(42, 95)" opacity="0.85">
        <ellipse cx="16" cy="23" rx="18" ry="3.5" fill="rgba(0,0,0,0.25)" />
        <ellipse cx="16" cy="12" rx="17" ry="9" fill="#9ca3af" />
        <ellipse cx="28" cy="6" rx="5" ry="8" fill="#9ca3af" transform="rotate(-20 28 6)" />
        <ellipse cx="34" cy="1" rx="6" ry="4" fill="#9ca3af" transform="rotate(-10 34 1)" />
        <circle cx="36" cy="-1" r="1.2" fill="#1a1a2e" />
        <path d="M26 1 Q24 -4 22 -2 Q20 -5 18 -2" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" fill="none" />
        <line x1="6" y1="20" x2="1" y2="30" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="12" y1="21" x2="15" y2="31" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="21" x2="10" y2="29" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="26" y1="20" x2="31" y2="29" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M0 12 Q-7 8 -5 15 Q-9 13 -6 20" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="14" cy="3" rx="5" ry="6" fill="#3b82f6" />
        <circle cx="14" cy="-4" r="4.5" fill="#fbbf24" />
        <ellipse cx="14" cy="-6.5" rx="5" ry="2.5" fill="#3b82f6" />
        <text x="14" y="5" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="white" fontFamily="'Barlow Condensed',sans-serif">2</text>
      </g>

      {/* Payout badge */}
      <g>
        <rect x="8" y="8" width="52" height="22" rx="5" fill="rgba(240,180,41,0.15)" stroke="rgba(240,180,41,0.5)" strokeWidth="1" />
        <text x="34" y="14" textAnchor="middle" fontSize="6" fill="rgba(240,180,41,0.7)" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700" letterSpacing="0.1em">WIN UP TO</text>
        <text x="34" y="25" textAnchor="middle" fontSize="10" fill="#f0b429" fontFamily="'Barlow Condensed',sans-serif" fontWeight="900">8× BET</text>
      </g>
    </svg>
  );
}

function BombDefuseArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="bomb-body" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#111827" />
        </radialGradient>
        <radialGradient id="bomb-glow-red" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(239,68,68,0.4)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <filter id="bomb-shadow">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(0,0,0,0.7)" />
        </filter>
        <filter id="wire-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Danger glow */}
      <ellipse cx="90" cy="90" rx="70" ry="55" fill="url(#bomb-glow-red)" />

      {/* Bomb body */}
      <g filter="url(#bomb-shadow)">
        {/* Spikes */}
        {Array.from({length:8},(_,i) => {
          const a = (i/8)*Math.PI*2 - Math.PI/2;
          return <line key={i} x1={90+34*Math.cos(a)} y1={90+34*Math.sin(a)} x2={90+46*Math.cos(a)} y2={90+46*Math.sin(a)} stroke="#4b5563" strokeWidth="5" strokeLinecap="round" />;
        })}
        {/* Outer shell */}
        <circle cx="90" cy="90" r="36" fill="url(#bomb-body)" />
        <circle cx="90" cy="90" r="36" fill="none" stroke="#4b5563" strokeWidth="1.5" />
        {/* Rivet ring */}
        {Array.from({length:12},(_,i) => {
          const a = (i/12)*Math.PI*2;
          return <circle key={i} cx={90+28*Math.cos(a)} cy={90+28*Math.sin(a)} r="1.5" fill="#6b7280" />;
        })}
        {/* Danger stripe ring */}
        <circle cx="90" cy="90" r="22" fill="none" stroke="rgba(239,68,68,0.25)" strokeWidth="1" />
        {/* Center screen / LED */}
        <rect x="74" y="78" width="32" height="20" rx="4" fill="#0a0a0a" stroke="#1f2937" strokeWidth="1" />
        {/* Countdown */}
        <text x="90" y="92" textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="900" fill="#ef4444" fontFamily="monospace" letterSpacing="1">
          0:30
          <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
        </text>
        {/* Shine */}
        <ellipse cx="74" cy="74" rx="14" ry="9" fill="rgba(255,255,255,0.07)" transform="rotate(-30 74 74)" />
      </g>

      {/* Fuse */}
      <path d="M90 54 Q102 42 96 28 Q90 16 100 8" stroke="#92400e" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Fuse spark */}
      <circle cx="100" cy="8" r="5" fill="#f97316" opacity="0.9">
        <animate attributeName="r" values="4;6;4" dur="0.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="8" r="3" fill="#fcd34d" />

      {/* Wires panel */}
      <g transform="translate(138, 55)">
        <rect x="0" y="0" width="50" height="72" rx="6" fill="rgba(15,25,35,0.9)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        {/* Wire labels */}
        {[
          { y: 14, color: "#ef4444", label: "CUT?" },
          { y: 30, color: "#3b82f6", label: "SAFE" },
          { y: 46, color: "#10b981", label: "CUT?" },
          { y: 62, color: "#f59e0b", label: "CUT?" },
        ].map((w, i) => (
          <g key={i}>
            <line x1="6" y1={w.y} x2="32" y2={w.y} stroke={w.color} strokeWidth="2.5" strokeLinecap="round" filter="url(#wire-glow)" />
            <text x="36" y={w.y + 4} fontSize="7" fill={w.color} fontFamily="'Barlow Condensed',sans-serif" fontWeight="700" opacity="0.8">{w.label}</text>
          </g>
        ))}
        {/* Wire connector dots */}
        {[14,30,46,62].map((y,i) => (
          <circle key={i} cx="6" cy={y} r="3" fill={["#ef4444","#3b82f6","#10b981","#f59e0b"][i]} />
        ))}
      </g>

      {/* Payout badge */}
      <g>
        <rect x="6" y="8" width="44" height="22" rx="5" fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.4)" strokeWidth="1" />
        <text x="28" y="14" textAnchor="middle" fontSize="5.5" fill="rgba(239,68,68,0.7)" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700" letterSpacing="0.08em">DEFUSE</text>
        <text x="28" y="25" textAnchor="middle" fontSize="10" fill="#ef4444" fontFamily="'Barlow Condensed',sans-serif" fontWeight="900">2X MONEY</text>
      </g>
    </svg>
  );
}

function ChickenArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="road-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        <linearGradient id="grass-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <filter id="car-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(0,0,0,0.5)" />
        </filter>
        <filter id="chick-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Safe side (left) — grass */}
      <rect x="0" y="0" width="30" height="150" fill="url(#grass-grad)" />
      {/* Road */}
      <rect x="30" y="0" width="140" height="150" fill="url(#road-grad)" />
      {/* Lane markings */}
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x="95" y={8 + i*38} width="10" height="22" rx="2" fill="rgba(255,255,255,0.12)" />
        </g>
      ))}
      {/* Destination (right) — grass */}
      <rect x="170" y="0" width="30" height="150" fill="url(#grass-grad)" />
      {/* Road edge lines */}
      <line x1="30" y1="0" x2="30" y2="150" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      <line x1="170" y1="0" x2="170" y2="150" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

      {/* Car 1 — red sports car going right */}
      <g transform="translate(50, 28)" filter="url(#car-shadow)">
        <rect x="0" y="8" width="52" height="22" rx="5" fill="#dc2626" />
        <rect x="8" y="2" width="34" height="16" rx="4" fill="#b91c1c" />
        {/* Windows */}
        <rect x="12" y="4" width="12" height="11" rx="2" fill="#93c5fd" opacity="0.8" />
        <rect x="26" y="4" width="12" height="11" rx="2" fill="#93c5fd" opacity="0.8" />
        {/* Headlights */}
        <circle cx="50" cy="13" r="3" fill="#fde68a" opacity="0.9" />
        <circle cx="50" cy="21" r="3" fill="#fde68a" opacity="0.9" />
        {/* Wheels */}
        <circle cx="10" cy="30" r="6" fill="#111827" /><circle cx="10" cy="30" r="3" fill="#374151" />
        <circle cx="42" cy="30" r="6" fill="#111827" /><circle cx="42" cy="30" r="3" fill="#374151" />
        {/* Speed lines */}
        <line x1="-4" y1="11" x2="-14" y2="11" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="-4" y1="16" x2="-18" y2="16" stroke="rgba(239,68,68,0.4)" strokeWidth="1" strokeLinecap="round" />
        <line x1="-4" y1="21" x2="-12" y2="21" stroke="rgba(239,68,68,0.3)" strokeWidth="1" strokeLinecap="round" />
      </g>

      {/* Car 2 — blue truck going left */}
      <g transform="translate(75, 95) scale(-1,1)" filter="url(#car-shadow)">
        <rect x="0" y="6" width="58" height="26" rx="5" fill="#1d4ed8" />
        <rect x="6" y="0" width="28" height="18" rx="4" fill="#1e40af" />
        <rect x="10" y="2" width="20" height="13" rx="2" fill="#93c5fd" opacity="0.7" />
        <circle cx="54" cy="14" r="4" fill="#fde68a" opacity="0.9" />
        <circle cx="54" cy="24" r="4" fill="#fde68a" opacity="0.9" />
        <circle cx="10" cy="32" r="7" fill="#111827" /><circle cx="10" cy="32" r="3.5" fill="#374151" />
        <circle cx="46" cy="32" r="7" fill="#111827" /><circle cx="46" cy="32" r="3.5" fill="#374151" />
        <line x1="-4" y1="14" x2="-16" y2="14" stroke="rgba(29,78,216,0.5)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-4" y1="20" x2="-20" y2="20" stroke="rgba(29,78,216,0.4)" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      {/* THE CHICKEN — crossing confidently, mid-road */}
      <g transform="translate(118, 58)" filter="url(#chick-glow)">
        {/* Glow */}
        <circle cx="12" cy="18" r="18" fill="rgba(251,191,36,0.15)" />
        {/* Shadow */}
        <ellipse cx="12" cy="42" rx="10" ry="3" fill="rgba(0,0,0,0.35)" />
        {/* Body */}
        <ellipse cx="12" cy="26" rx="10" ry="12" fill="#fbbf24" />
        {/* Wing detail */}
        <ellipse cx="4" cy="28" rx="4" ry="6" fill="#f59e0b" />
        <ellipse cx="20" cy="28" rx="4" ry="6" fill="#f59e0b" />
        {/* Feather details */}
        <path d="M6 22 Q3 18 5 16" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M18 22 Q21 18 19 16" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Neck */}
        <rect x="8" y="13" width="8" height="8" rx="3" fill="#fbbf24" />
        {/* Head */}
        <circle cx="12" cy="10" r="9" fill="#fbbf24" />
        {/* Eye */}
        <circle cx="15" cy="8" r="3" fill="white" />
        <circle cx="16" cy="8" r="1.8" fill="#1a0a00" />
        <circle cx="16.5" cy="7.2" r="0.6" fill="white" />
        {/* Beak */}
        <polygon points="18,12 23,10 18,14" fill="#f97316" />
        {/* Comb */}
        <path d="M8 2 Q7 -3 10 -1 Q9 -5 12 -3 Q11 -6 14 -4 Q15 -2 14 1" fill="#ef4444" />
        {/* Wattle */}
        <ellipse cx="17" cy="16" rx="2.5" ry="3.5" fill="#ef4444" />
        {/* Legs — mid-stride */}
        <line x1="8" y1="37" x2="4" y2="46" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="46" x2="1" y2="48" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="46" x2="4" y2="50" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="37" x2="20" y2="43" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="43" x2="24" y2="48" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
        <line x1="20" y1="43" x2="22" y2="50" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
        {/* Sweat drop (nervous!) */}
        <path d="M22 5 Q24 2 22 0 Q20 2 22 5Z" fill="#60a5fa" opacity="0.8" />
      </g>

      {/* Multiplier badge */}
      <g>
        <rect x="6" y="8" width="52" height="22" rx="5" fill="rgba(251,191,36,0.15)" stroke="rgba(251,191,36,0.5)" strokeWidth="1" />
        <text x="32" y="14" textAnchor="middle" fontSize="5.5" fill="rgba(251,191,36,0.7)" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700" letterSpacing="0.08em">CASH OUT</text>
        <text x="32" y="25" textAnchor="middle" fontSize="10" fill="#fbbf24" fontFamily="'Barlow Condensed',sans-serif" fontWeight="900">ANYTIME</text>
      </g>
    </svg>
  );
}

function SpamArt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="spam-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="55%" stopColor="#115e59" />
          <stop offset="100%" stopColor="#0b2f33" />
        </linearGradient>
        <radialGradient id="spam-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="rgba(45,212,191,0.35)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <rect x="22" y="16" width="156" height="108" rx="16" fill="url(#spam-bg)" />
      <ellipse cx="100" cy="70" rx="64" ry="42" fill="url(#spam-glow)" />

      <g opacity="0.16">
        {[48, 76, 104, 132].map((x) => (
          <line key={x} x1={x} y1="24" x2={x} y2="116" stroke="white" strokeWidth="1" />
        ))}
        {[42, 64, 86, 108].map((y) => (
          <line key={y} x1="30" y1={y} x2="170" y2={y} stroke="white" strokeWidth="1" />
        ))}
      </g>

      <rect x="40" y="38" width="44" height="54" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
      <rect x="116" y="38" width="44" height="54" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
      <text x="62" y="72" textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="900" fill="#99f6e4" fontFamily="'Barlow Condensed',sans-serif">248</text>
      <text x="138" y="72" textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="900" fill="#fcd34d" fontFamily="'Barlow Condensed',sans-serif">241</text>

      <text x="100" y="60" textAnchor="middle" fontSize="13" fontWeight="800" fill="white" fontFamily="'Barlow Condensed',sans-serif" letterSpacing="0.18em">SPAM!</text>
      <text x="100" y="82" textAnchor="middle" fontSize="12" fontWeight="700" fill="rgba(255,255,255,0.8)" fontFamily="'Barlow Condensed',sans-serif" letterSpacing="0.14em">3 2 1</text>

      <rect x="63" y="98" width="74" height="16" rx="8" fill="rgba(0,0,0,0.24)" />
      <text x="100" y="109" textAnchor="middle" fontSize="8" fontWeight="800" fill="#f0fdfa" fontFamily="'Barlow Condensed',sans-serif" letterSpacing="0.16em">HEAD TO HEAD</text>
    </svg>
  );
}

// ── Game data ─────────────────────────────────────────────────────────────────

const GAMES: ReadonlyArray<{
  label: string;
  href: string;
  locked: boolean;
  multiplayer?: boolean;
  gradient: string;
  art: React.ReactNode;
}> = [
  {
    label: "Blackjack",
    href: "/blackjack",
    locked: false,
    gradient: "linear-gradient(145deg, #f59e0b 0%, #b45309 55%, #78350f 100%)",
    art: <BlackjackArt />,
  },
  {
    label: "Mines",
    href: "/mines",
    locked: false,
    gradient: "linear-gradient(145deg, #7c3aed 0%, #4c1d95 55%, #2e1065 100%)",
    art: <MinesArt />,
  },
  {
    label: "Roulette",
    href: "/roulette",
    locked: false,
    gradient: "linear-gradient(145deg, #dc2626 0%, #991b1b 55%, #5c0a0a 100%)",
    art: <RouletteArt />,
  },
  {
    label: "Golf",
    href: "/golf",
    locked: false,
    gradient: "linear-gradient(145deg, #16a34a 0%, #166534 55%, #14532d 100%)",
    art: <GolfArt />,
  },
  {
    label: "Slots",
    href: "/slots",
    locked: false,
    gradient: "linear-gradient(145deg, #0891b2 0%, #155e75 55%, #083344 100%)",
    art: <SlotsArt />,
  },
  {
    label: "Crash",
    href: "/crash",
    locked: false,
    gradient: "linear-gradient(145deg, #ea580c 0%, #9a3412 55%, #431407 100%)",
    art: <CrashArt />,
  },
  {
    label: "March Madness",
    href: "/sports",
    locked: false,
    gradient: "linear-gradient(145deg, #2563eb 0%, #1e3a8a 55%, #0f1f5c 100%)",
    art: <SportsArt />,
  },
  {
    label: "Plinko",
    href: "/plinko",
    locked: false,
    gradient: "linear-gradient(145deg, #8b5cf6 0%, #4c1d95 40%, #2563eb 100%)",
    art: <PlinkoArt />,
  },
  {
    label: "Plinko II",
    href: "/plinko-ii",
    locked: false,
    gradient: "linear-gradient(145deg, #0f172a 0%, #1d4ed8 35%, #7c3aed 68%, #f97316 100%)",
    art: <PlinkoIIArt />,
  },
  {
    label: "Horse Racing",
    href: "/horse-racing",
    locked: false,
    gradient: "linear-gradient(145deg, #16a34a 0%, #166534 55%, #052e16 100%)",
    art: <HorseRacingArt />,
  },
  {
    label: "Bomb Defuse",
    href: "/bomb-defuse",
    locked: false,
    gradient: "linear-gradient(145deg, #dc2626 0%, #7f1d1d 55%, #2d0a0a 100%)",
    art: <BombDefuseArt />,
  },
  {
    label: "SPAM!",
    href: "/spam",
    locked: false,
    multiplayer: true,
    gradient: "linear-gradient(145deg, #14b8a6 0%, #0f766e 55%, #0b2f33 100%)",
    art: <SpamArt />,
  },
  {
    label: "Chicken",
    href: "/chicken",
    locked: false,
    gradient: "linear-gradient(145deg, #d97706 0%, #92400e 55%, #451a03 100%)",
    art: <ChickenArt />,
  },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

function LiveEventsHeroCard() {
  const { resolvedState, eventCountdown, nextCountdown } = useLiveEvents();
  const liveEvent = resolvedState.currentEvent;
  const nextEvents = resolvedState.upcomingEvents;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      style={{
        marginBottom: 20,
        borderRadius: 12,
        border: "1px solid rgba(240,180,41,0.16)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 12,
          padding: "12px 14px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                background: liveEvent ? "linear-gradient(135deg, #f97316, #ef4444)" : "rgba(255,255,255,0.08)",
                color: liveEvent ? "#fff" : "var(--text-secondary)",
                borderRadius: 999,
                padding: "3px 8px",
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {liveEvent ? "Live Event" : "Upcoming"}
            </span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.74rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              8 AM to 4 PM local
            </span>
          </div>

          <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.95rem" }}>
            {liveEvent
              ? `${liveEvent.targetGames[0]} is 2x right now`
              : nextEvents[0]
                ? `${nextEvents[0].targetGames[0]} goes 2x next`
                : "No live event active"}
          </div>

          <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.45 }}>
            {liveEvent
              ? `${liveEvent.displayText} Ends in ${eventCountdown}.`
              : nextEvents[0]
                ? `${nextEvents[0].targetGames[0]} goes 2x at ${formatEventStart(nextEvents[0].startAtMs)}.`
                : "Come back during the daily rotation."}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={`/${(liveEvent ?? nextEvents[0])?.eventKey === "plinko" ? "plinko" : (liveEvent ?? nextEvents[0])?.eventKey ?? "plinko"}`}
              style={{
                textDecoration: "none",
                color: "var(--accent-gold)",
                borderRadius: 999,
                padding: "8px 12px",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                border: "1px solid rgba(240,180,41,0.2)",
                background: "rgba(240,180,41,0.08)",
              }}
            >
              {liveEvent ? `Play ${liveEvent.targetGames[0]}` : nextEvents[0] ? `View ${nextEvents[0].targetGames[0]}` : "View Event"}
            </Link>
            <span style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>
              {liveEvent ? `Ends ${formatEventStart(liveEvent.endAtMs)}` : nextCountdown}
            </span>
          </div>
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.16)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ color: "var(--accent-gold)", fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
            Next 2 boosts
          </div>
          {nextEvents.slice(0, 2).map((event, index) => (
            <div
              key={event.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  color: "var(--accent-gold)",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  background: "rgba(240,180,41,0.1)",
                  border: "1px solid rgba(240,180,41,0.18)",
                  borderRadius: 7,
                  padding: "6px 8px",
                }}
              >
                {event.targetGames[0]} goes 2x
              </div>
              <span style={{ color: "var(--accent-gold)", fontWeight: 700, fontSize: "0.78rem" }}>
                {index === 0 ? nextCountdown : formatEventStart(event.startAtMs)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  return (
    <div style={{
      height: "100%",
      overflow: "auto",
      background: "var(--bg-primary)",
      padding: "32px 28px 40px",
    }}>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: "36px" }}
      >
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "clamp(2rem, 4vw, 3rem)",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          lineHeight: 1.1,
          marginBottom: "10px",
        }}>
          <span className="shimmer-text">GRAX</span>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.6em", fontWeight: 500, letterSpacing: "0.05em" }}>.bet</span>
        </h1>
        <p style={{
          color: "var(--text-secondary)",
          fontSize: "0.95rem",
          maxWidth: "420px",
          lineHeight: 1.6,
        }}>
          Premium fake-money casino. All the thrills, none of the risk.
        </p>
      </motion.div>

      <LiveEventsHeroCard />

      {/* Section heading */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "20px",
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: "0.65rem",
          letterSpacing: "0.22em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}>
          Casino Games
        </span>
        <div style={{ flex: 1, height: "1px", background: "var(--border-color)" }} />
      </div>

      {/* Game card grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        gap: "16px",
      }}>
        {GAMES.map((game, i) => {
          const card = (
            <motion.div
              key={game.label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              whileHover={game.locked ? {} : { scale: 1.03, y: -4 }}
              whileTap={game.locked ? {} : { scale: 0.97 }}
              style={{
                background: game.gradient,
                borderRadius: "14px",
                overflow: "hidden",
                cursor: game.locked ? "default" : "pointer",
                position: "relative",
                boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.08)",
                opacity: game.locked ? 0.7 : 1,
                transition: "box-shadow 0.2s",
                display: "block",
                textDecoration: "none",
              }}
            >
              {/* Art area */}
              <div style={{
                height: "155px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 8px 0",
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Subtle noise grain on card */}
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
                  backgroundSize: "200px 200px", mixBlendMode: "overlay", pointerEvents: "none",
                }} />
                <div style={{ width: "100%", height: "100%" }}>
                  {game.art}
                </div>
              </div>

              {/* Label area */}
              <div style={{
                padding: "10px 14px 14px",
                background: "rgba(0,0,0,0.25)",
              }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: "1.15rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "white",
                  lineHeight: 1,
                  marginBottom: "3px",
                }}>
                  {game.label}
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.45)",
                  textTransform: "uppercase",
                }}>
                  GRAX.BET
                </div>
              </div>

              {/* Locked overlay */}
              {game.locked && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(0,0,0,0.35)",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                  padding: "10px",
                }}>
                  <div style={{
                    background: "rgba(0,0,0,0.6)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "20px",
                    padding: "3px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}>
                    <svg width="9" height="10" viewBox="0 0 9 10" fill="rgba(255,255,255,0.55)">
                      <rect x="1" y="4" width="7" height="5.5" rx="1.2" />
                      <path d="M2.2 4V3a2.3 2.3 0 014.6 0v1" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" fill="none" />
                    </svg>
                    <span style={{ fontSize: "0.58rem", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.55)" }}>SOON</span>
                  </div>
                </div>
              )}

              {/* Live badge for unlocked */}
              {!game.locked && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  background: game.multiplayer ? "#f0b429" : "var(--accent-green)",
                  borderRadius: "20px",
                  padding: "2px 8px",
                  fontSize: "0.58rem",
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#0f1923",
                }}>
                  {game.multiplayer ? "MULTIPLAYER" : "LIVE"}
                </div>
              )}
            </motion.div>
          );

          return game.locked
            ? <div key={game.label}>{card}</div>
            : <Link key={game.label} href={game.href} style={{ textDecoration: "none", display: "block" }}>{card}</Link>;
        })}
      </div>

      {/* Bottom tagline */}
      <div style={{
        marginTop: "40px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.7rem",
        fontFamily: "'Barlow Condensed',sans-serif",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}>
        Play responsibly · Fake money only · No real stakes
      </div>
    </div>
  );
}

function formatEventStart(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
