"use client";

import Image from "next/image";

const HORSES = [
  { id: 1, name: "Crimson Comet", tint: "hue-rotate(0deg) saturate(1.2)" },
  { id: 2, name: "Azure Bolt", tint: "hue-rotate(210deg) saturate(1.25)" },
  { id: 3, name: "Emerald Dash", tint: "hue-rotate(110deg) saturate(1.35)" },
  { id: 4, name: "Golden Flash", tint: "hue-rotate(36deg) saturate(1.45)" },
  { id: 5, name: "Violet Storm", tint: "hue-rotate(270deg) saturate(1.25)" },
  { id: 6, name: "Shadow Drift", tint: "grayscale(1) brightness(0.7)" },
] as const;

export default function HorseRacingPage() {
  return (
    <main style={{ padding: "20px", maxWidth: 1180, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: "1.9rem", fontWeight: 800 }}>Horse Racing</h1>
      <p style={{ marginTop: 8, color: "var(--text-muted)" }}>
        Starter layout with six horses staged at the starting gate.
      </p>

      <section
        style={{
          marginTop: 16,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          overflow: "hidden",
          background: "linear-gradient(180deg, #0b2c4e 0%, #0c1f38 42%, #14532d 42%, #14532d 100%)",
        }}
      >
        <div
          style={{
            padding: "16px 16px 24px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
          }}
        >
          {HORSES.map((horse, idx) => (
            <div
              key={horse.id}
              style={{
                position: "relative",
                height: 74,
                borderTop: idx === 0 ? "none" : "1px dashed rgba(255,255,255,0.22)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 100,
                  top: 10,
                  width: 118,
                  height: 64,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  filter: horse.tint,
                }}
              >
                <Image
                  src="/horse-racing/horse-sprite.svg"
                  alt={horse.name}
                  width={118}
                  height={64}
                  draggable={false}
                  style={{ imageRendering: "pixelated", userSelect: "none" }}
                />
              </div>

              <div
                style={{
                  position: "absolute",
                  left: 84,
                  top: 8,
                  bottom: 0,
                  width: 4,
                  background: "repeating-linear-gradient(180deg, #f8fafc, #f8fafc 10px, #ef4444 10px, #ef4444 20px)",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: 18,
                  color: "rgba(248,250,252,0.95)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  letterSpacing: "0.03em",
                }}
              >
                #{horse.id}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: 39,
                  color: "rgba(248,250,252,0.68)",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {horse.name}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
