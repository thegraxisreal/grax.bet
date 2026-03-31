interface PowerBarProps {
  power: number;
}

export default function PowerBar({ power }: PowerBarProps) {
  return (
    <div style={{ width: 26, height: 180, border: "2px solid #1f2937", background: "#0b1220", padding: 3 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg,#ef4444 0%, #f59e0b 50%, #22c55e 100%)",
          imageRendering: "pixelated",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -4,
            right: -4,
            height: 4,
            top: `${(1 - power) * 100}%`,
            background: "#e5e7eb",
            boxShadow: "0 0 0 2px #111827",
            transform: "translateY(-50%)",
          }}
        />
      </div>
    </div>
  );
}
