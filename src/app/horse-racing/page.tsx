"use client";

const SPRITE_URL = "https://opengameart.org/sites/default/files/horse_run_cycle_0.png";
const FRAME_WIDTH = 82;
const FRAME_HEIGHT = 66;
const TOTAL_FRAMES = 5;

const HORSES = [
  { id: 1, name: "Crimson Comet", filter: "hue-rotate(0deg) saturate(1.15)" },
  { id: 2, name: "Azure Bolt", filter: "hue-rotate(190deg) saturate(1.2)" },
  { id: 3, name: "Emerald Dash", filter: "hue-rotate(105deg) saturate(1.25)" },
  { id: 4, name: "Golden Flash", filter: "hue-rotate(35deg) saturate(1.35)" },
  { id: 5, name: "Violet Storm", filter: "hue-rotate(265deg) saturate(1.2)" },
  { id: 6, name: "Shadow Drift", filter: "grayscale(1) brightness(0.72)" },
] as const;

export default function HorseRacingPage() {
  return (
    <main style={{ padding: "20px", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: "1.9rem", fontWeight: 800 }}>Horse Racing</h1>
      <p style={{ marginTop: 8, color: "var(--text-muted)" }}>
        Using the CC0 OpenGameArt pixel horse run cycle (82×66, 5 frames), staged at the starting line.
      </p>

      <section
        style={{
          marginTop: 16,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          overflow: "hidden",
          background: "linear-gradient(180deg, #0b2c4e 0%, #0c1f38 45%, #14532d 45%, #14532d 100%)",
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
                height: 86,
                borderTop: idx === 0 ? "none" : "1px dashed rgba(255,255,255,0.22)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 92,
                  top: 8,
                  bottom: 8,
                  width: 4,
                  background: "repeating-linear-gradient(180deg, #f8fafc, #f8fafc 10px, #ef4444 10px, #ef4444 20px)",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
                }}
              />

              <div style={{ position: "absolute", left: 122, top: 10, transform: "scale(2.35)", transformOrigin: "top left" }}>
                <div className="horse-shadow" />
                <div className="horse-run" style={{ filter: horse.filter }} aria-label={horse.name} role="img" />
              </div>

              <div style={{ position: "absolute", left: 12, top: 18, color: "rgba(248,250,252,0.95)", fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.03em" }}>
                #{horse.id}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: 42,
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

      <style jsx>{`
        .horse-run {
          width: ${FRAME_WIDTH}px;
          height: ${FRAME_HEIGHT}px;
          background-image: url(${SPRITE_URL});
          background-repeat: no-repeat;
          image-rendering: pixelated;
          animation: gallop 0.42s steps(${TOTAL_FRAMES}) infinite;
          will-change: background-position;
        }

        .horse-shadow {
          position: absolute;
          width: 56px;
          height: 9px;
          left: 12px;
          bottom: -6px;
          background: rgba(3, 7, 18, 0.35);
          border-radius: 999px;
          filter: blur(1px);
        }

        @keyframes gallop {
          from {
            background-position: 0 0;
          }
          to {
            background-position: -${FRAME_WIDTH * TOTAL_FRAMES}px 0;
          }
        }
      `}</style>
    </main>
  );
}
