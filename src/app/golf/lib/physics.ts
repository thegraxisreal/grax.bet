import { BallState, HammerHazard, HoleConfig, Obstacle, SurfaceZone, Vec2 } from "./types";

const STOP_SPEED = 22;

export function vecLength(v: Vec2) {
  return Math.hypot(v.x, v.y);
}

function dot(a: Vec2, b: Vec2) {
  return a.x * b.x + a.y * b.y;
}

function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const t = Math.max(0, Math.min(1, dot({ x: p.x - a.x, y: p.y - a.y }, ab) / dot(ab, ab)));
  return { x: a.x + ab.x * t, y: a.y + ab.y * t };
}

function surfaceAt(point: Vec2, surfaces: SurfaceZone[]) {
  return surfaces.find((s) => point.x >= s.x && point.x <= s.x + s.w && point.y >= s.y && point.y <= s.y + s.h);
}

function reflectVelocity(vel: Vec2, normal: Vec2, bounce = 0.9): Vec2 {
  const proj = dot(vel, normal);
  return {
    x: (vel.x - 2 * proj * normal.x) * bounce,
    y: (vel.y - 2 * proj * normal.y) * bounce,
  };
}

function collideWithObstacle(ball: BallState, obstacle: Obstacle, radius: number): boolean {
  if (obstacle.type === "circle") {
    const dx = ball.pos.x - obstacle.center.x;
    const dy = ball.pos.y - obstacle.center.y;
    const dist = Math.hypot(dx, dy);
    const target = obstacle.radius + radius;
    if (dist < target) {
      const nx = dist === 0 ? 1 : dx / dist;
      const ny = dist === 0 ? 0 : dy / dist;
      ball.pos.x = obstacle.center.x + nx * target;
      ball.pos.y = obstacle.center.y + ny * target;
      ball.vel = reflectVelocity(ball.vel, { x: nx, y: ny }, obstacle.bounce ?? 0.9);
      return true;
    }
    return false;
  }

  const nearestX = Math.max(obstacle.x, Math.min(ball.pos.x, obstacle.x + obstacle.w));
  const nearestY = Math.max(obstacle.y, Math.min(ball.pos.y, obstacle.y + obstacle.h));
  const dx = ball.pos.x - nearestX;
  const dy = ball.pos.y - nearestY;
  const dist = Math.hypot(dx, dy);

  if (dist < radius) {
    const nx = dist === 0 ? (Math.abs(dx) > Math.abs(dy) ? Math.sign(dx || 1) : 0) : dx / dist;
    const ny = dist === 0 ? (Math.abs(dy) >= Math.abs(dx) ? Math.sign(dy || 1) : 0) : dy / dist;
    const push = radius - dist;
    ball.pos.x += nx * push;
    ball.pos.y += ny * push;
    ball.vel = reflectVelocity(ball.vel, { x: nx, y: ny }, obstacle.bounce ?? 0.88);
    return true;
  }

  return false;
}

export function hammerHeadPosition(hammer: HammerHazard, elapsedSec: number): Vec2 {
  const span = (hammer.angleMax - hammer.angleMin) / 2;
  const mid = (hammer.angleMax + hammer.angleMin) / 2;
  const a = mid + Math.sin(elapsedSec * hammer.speed) * span;
  return {
    x: hammer.pivot.x + Math.cos(a) * hammer.armLength,
    y: hammer.pivot.y + Math.sin(a) * hammer.armLength,
  };
}

function collideWithHammers(ball: BallState, hole: HoleConfig, elapsedSec: number): boolean {
  for (const hammer of hole.hammers ?? []) {
    const head = hammerHeadPosition(hammer, elapsedSec);
    const dx = ball.pos.x - head.x;
    const dy = ball.pos.y - head.y;
    const dist = Math.hypot(dx, dy);
    const target = hammer.headRadius + hole.ballRadius;
    if (dist < target) {
      const nx = dist === 0 ? 1 : dx / dist;
      const ny = dist === 0 ? 0 : dy / dist;
      ball.pos.x = head.x + nx * target;
      ball.pos.y = head.y + ny * target;
      ball.vel = reflectVelocity({ x: ball.vel.x + nx * 130, y: ball.vel.y + ny * 130 }, { x: nx, y: ny }, 1.02);
      return true;
    }
  }
  return false;
}

export function stepBall(ball: BallState, hole: HoleConfig, dt: number, elapsedSec: number) {
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;

  let bounced = false;

  for (const wall of hole.walls) {
    const closest = closestPointOnSegment(ball.pos, wall.from, wall.to);
    const dx = ball.pos.x - closest.x;
    const dy = ball.pos.y - closest.y;
    const dist = Math.hypot(dx, dy);
    if (dist < hole.ballRadius) {
      const nx = dist === 0 ? 1 : dx / dist;
      const ny = dist === 0 ? 0 : dy / dist;
      ball.pos.x = closest.x + nx * hole.ballRadius;
      ball.pos.y = closest.y + ny * hole.ballRadius;
      ball.vel = reflectVelocity(ball.vel, { x: nx, y: ny }, 0.91);
      bounced = true;
    }
  }

  for (const obstacle of hole.obstacles) {
    if (collideWithObstacle(ball, obstacle, hole.ballRadius)) bounced = true;
  }
  if (collideWithHammers(ball, hole, elapsedSec)) bounced = true;

  const surface = surfaceAt(ball.pos, hole.surfaces);
  const friction = Math.min(0.988, (surface?.friction ?? 0.984) + 0.008);
  ball.vel.x *= friction;
  ball.vel.y *= friction;

  if (surface?.kind === "lava") {
    return { bounced, inLava: true, stopped: false };
  }

  const speed = vecLength(ball.vel);
  if (speed < STOP_SPEED) {
    ball.vel.x = 0;
    ball.vel.y = 0;
    ball.moving = false;
    return { bounced, inLava: false, stopped: true };
  }

  ball.moving = true;
  return { bounced, inLava: false, stopped: false };
}

export function isBallInCup(ball: BallState, hole: HoleConfig) {
  const dx = ball.pos.x - hole.cup.x;
  const dy = ball.pos.y - hole.cup.y;
  const dist = Math.hypot(dx, dy);
  return dist <= hole.cupRadius + hole.ballRadius;
}
