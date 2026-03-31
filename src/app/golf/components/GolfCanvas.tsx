"use client";

import { useEffect, useRef, useState } from "react";
import { HoleConfig } from "../lib/types";
import { isBallInCup, stepBall } from "../lib/physics";
import PowerBar from "./PowerBar";

type ShotPhase = "aim" | "power";

interface GolfCanvasProps {
  hole: HoleConfig;
  onFinish: (strokes: number) => void;
}

export default function GolfCanvas({ hole, onFinish }: GolfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState(0);
  const [phase, setPhase] = useState<ShotPhase>("aim");
  const [powerValue, setPowerValue] = useState(0.5);

  const strokesRef = useRef(0);
  const shotPhaseRef = useRef<ShotPhase>("aim");
  const angleRef = useRef(-Math.PI / 2);
  const lockedAngleRef = useRef(0);
  const powerDirRef = useRef(1);
  const powerRef = useRef(0.5);
  const finishedRef = useRef(false);

  const ballRef = useRef({
    pos: { ...hole.tee },
    vel: { x: 0, y: 0 },
    lastSafePos: { ...hole.tee },
    moving: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const draw = (ctx2d: CanvasRenderingContext2D) => {
      ctx2d.clearRect(0, 0, hole.width, hole.height);
      ctx2d.imageSmoothingEnabled = false;
      ctx2d.fillStyle = "#0d3f26";
      ctx2d.fillRect(0, 0, hole.width, hole.height);

      for (const surface of hole.surfaces) {
        if (surface.kind === "fairway") ctx2d.fillStyle = "#1f6b3a";
        if (surface.kind === "rough") ctx2d.fillStyle = "#19552d";
        if (surface.kind === "sand") ctx2d.fillStyle = "#a07a42";
        if (surface.kind === "water") ctx2d.fillStyle = "#1d4ed8";
        ctx2d.fillRect(surface.x, surface.y, surface.w, surface.h);
      }

      for (let x = 0; x < hole.width; x += 8) {
        for (let y = 0; y < hole.height; y += 8) {
          ctx2d.fillStyle = (x + y) % 16 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)";
          ctx2d.fillRect(x, y, 4, 4);
        }
      }

      ctx2d.fillStyle = "#111827";
      ctx2d.beginPath();
      ctx2d.arc(hole.cup.x, hole.cup.y, hole.cupRadius, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.fillStyle = "#ef4444";
      ctx2d.fillRect(hole.cup.x + 12, hole.cup.y - 32, 6, 28);
      ctx2d.fillStyle = "#fde047";
      ctx2d.fillRect(hole.cup.x + 18, hole.cup.y - 32, 18, 13);

      ctx2d.strokeStyle = "#4b5563";
      ctx2d.lineWidth = 8;
      hole.walls.forEach((w) => {
        ctx2d.beginPath();
        ctx2d.moveTo(w.from.x, w.from.y);
        ctx2d.lineTo(w.to.x, w.to.y);
        ctx2d.stroke();
      });

      for (const o of hole.obstacles) {
        ctx2d.fillStyle = "#6b7280";
        if (o.type === "rect") ctx2d.fillRect(o.x, o.y, o.w, o.h);
        if (o.type === "circle") {
          ctx2d.beginPath();
          ctx2d.arc(o.center.x, o.center.y, o.radius, 0, Math.PI * 2);
          ctx2d.fill();
        }
      }

      const b = ballRef.current;
      ctx2d.fillStyle = "#f8fafc";
      ctx2d.beginPath();
      ctx2d.arc(b.pos.x, b.pos.y, hole.ballRadius, 0, Math.PI * 2);
      ctx2d.fill();

      if (!b.moving && !finishedRef.current) {
        const activeAngle = shotPhaseRef.current === "aim" ? angleRef.current : lockedAngleRef.current;
        ctx2d.strokeStyle = "#f0b429";
        ctx2d.lineWidth = 3;
        ctx2d.beginPath();
        ctx2d.moveTo(b.pos.x, b.pos.y);
        ctx2d.lineTo(b.pos.x + Math.cos(activeAngle) * 45, b.pos.y + Math.sin(activeAngle) * 45);
        ctx2d.stroke();
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;

      if (!ballRef.current.moving && !finishedRef.current) {
        if (shotPhaseRef.current === "aim") {
          angleRef.current += dt * 2.2;
        } else {
          powerRef.current += dt * powerDirRef.current * 0.95;
          if (powerRef.current >= 1) {
            powerRef.current = 1;
            powerDirRef.current = -1;
          }
          if (powerRef.current <= 0.08) {
            powerRef.current = 0.08;
            powerDirRef.current = 1;
          }
          setPowerValue(powerRef.current);
        }
      }

      if (ballRef.current.moving) {
        const r = stepBall(ballRef.current, hole, dt);
        if (r.inWater) {
          ballRef.current.pos = { ...ballRef.current.lastSafePos };
          ballRef.current.vel = { x: 0, y: 0 };
          ballRef.current.moving = false;
          strokesRef.current += 1;
          setStrokes(strokesRef.current);
          shotPhaseRef.current = "aim";
          setPhase("aim");
        } else if (r.stopped) {
          ballRef.current.lastSafePos = { ...ballRef.current.pos };
          shotPhaseRef.current = "aim";
          setPhase("aim");
        }

        if (isBallInCup(ballRef.current, hole)) {
          finishedRef.current = true;
          onFinish(strokesRef.current);
        }
      }

      if (strokesRef.current >= hole.maxStrokes && !finishedRef.current) {
        finishedRef.current = true;
        onFinish(hole.maxStrokes);
      }

      draw(ctx);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hole, onFinish]);

  const onShootClick = () => {
    if (finishedRef.current || ballRef.current.moving) return;
    if (shotPhaseRef.current === "aim") {
      lockedAngleRef.current = angleRef.current;
      shotPhaseRef.current = "power";
      setPhase("power");
      return;
    }

    const speed = 150 + powerRef.current * 520;
    ballRef.current.vel = {
      x: Math.cos(lockedAngleRef.current) * speed,
      y: Math.sin(lockedAngleRef.current) * speed,
    };
    ballRef.current.moving = true;
    shotPhaseRef.current = "aim";
    setPhase("aim");
    strokesRef.current += 1;
    setStrokes(strokesRef.current);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-300">
        <span>Par {hole.par}</span>
        <span>Strokes {strokes}</span>
        <span>{phase === "aim" ? "Tap: Lock Aim" : "Tap: Lock Power"}</span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border" style={{ borderColor: "#334155", background: "#020617" }}>
        <canvas
          ref={canvasRef}
          width={hole.width}
          height={hole.height}
          onClick={onShootClick}
          className="h-full w-full touch-manipulation"
          style={{ imageRendering: "pixelated", objectFit: "contain" }}
        />
        {phase === "power" && (
          <div className="absolute right-3 top-3">
            <PowerBar power={powerValue} />
          </div>
        )}
      </div>
    </div>
  );
}
