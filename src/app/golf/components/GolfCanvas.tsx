"use client";

import { useEffect, useRef, useState } from "react";
import { HoleConfig, RoundResult } from "../lib/types";
import { hammerHeadPosition, isBallInCup, stepBall } from "../lib/physics";

type ShotPhase = "aim" | "power";

interface GolfCanvasProps {
  hole: HoleConfig;
  onFinish: (result: RoundResult) => void;
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
  const elapsedRef = useRef(0);

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
      ctx2d.fillStyle = hole.theme.bg;
      ctx2d.fillRect(0, 0, hole.width, hole.height);

      for (const surface of hole.surfaces) {
        if (surface.kind === "fairway") ctx2d.fillStyle = hole.theme.fairway;
        if (surface.kind === "rough") ctx2d.fillStyle = hole.theme.rough;
        if (surface.kind === "sand") ctx2d.fillStyle = hole.theme.sand;
        if (surface.kind === "lava") ctx2d.fillStyle = hole.theme.lava;
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

      ctx2d.strokeStyle = hole.theme.wall;
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

      for (const hammer of hole.hammers ?? []) {
        const head = hammerHeadPosition(hammer, elapsedRef.current);
        ctx2d.strokeStyle = "#cbd5e1";
        ctx2d.lineWidth = 5;
        ctx2d.beginPath();
        ctx2d.moveTo(hammer.pivot.x, hammer.pivot.y);
        ctx2d.lineTo(head.x, head.y);
        ctx2d.stroke();
        ctx2d.fillStyle = "#ef4444";
        ctx2d.beginPath();
        ctx2d.arc(head.x, head.y, hammer.headRadius, 0, Math.PI * 2);
        ctx2d.fill();
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

        if (shotPhaseRef.current === "power") {
          const barH = 70;
          const barW = 10;
          const barX = b.pos.x + 18;
          const barY = b.pos.y - 35;
          ctx2d.fillStyle = "#111827";
          ctx2d.fillRect(barX, barY, barW, barH);
          ctx2d.fillStyle = "#22c55e";
          ctx2d.fillRect(barX, barY + barH * 0.66, barW, barH * 0.34);
          ctx2d.fillStyle = "#eab308";
          ctx2d.fillRect(barX, barY + barH * 0.33, barW, barH * 0.33);
          ctx2d.fillStyle = "#ef4444";
          ctx2d.fillRect(barX, barY, barW, barH * 0.33);
          const markerY = barY + (1 - powerRef.current) * barH;
          ctx2d.fillStyle = "#e2e8f0";
          ctx2d.fillRect(barX - 3, markerY - 2, barW + 6, 4);
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      elapsedRef.current += dt;

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
        const r = stepBall(ballRef.current, hole, dt, elapsedRef.current);
        if (r.inLava) {
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
          onFinish({ won: true, strokes: strokesRef.current });
        }
      }

      if (strokesRef.current >= hole.maxStrokes && !finishedRef.current) {
        finishedRef.current = true;
        onFinish({ won: false, strokes: hole.maxStrokes });
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
        <span>{phase === "aim" ? "Tap: Lock Aim" : `Power ${Math.round(powerValue * 100)}%`}</span>
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
      </div>
    </div>
  );
}
