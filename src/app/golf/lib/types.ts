export type BetTarget = "under" | "over";

export interface Vec2 {
  x: number;
  y: number;
}

export interface WallSegment {
  from: Vec2;
  to: Vec2;
}

export interface RectObstacle {
  id: string;
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  bounce?: number;
}

export interface CircleObstacle {
  id: string;
  type: "circle";
  center: Vec2;
  radius: number;
  bounce?: number;
}

export type Obstacle = RectObstacle | CircleObstacle;

export interface SurfaceZone {
  id: string;
  kind: "fairway" | "rough" | "sand" | "lava";
  x: number;
  y: number;
  w: number;
  h: number;
  friction: number;
}

export interface HammerHazard {
  id: string;
  pivot: Vec2;
  armLength: number;
  angleMin: number;
  angleMax: number;
  speed: number;
  headRadius: number;
}

export interface HoleConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  par: number;
  tee: Vec2;
  cup: Vec2;
  cupRadius: number;
  ballRadius: number;
  maxStrokes: number;
  multiplier: number;
  theme: {
    bg: string;
    fairway: string;
    rough: string;
    sand: string;
    lava: string;
    wall: string;
  };
  walls: WallSegment[];
  obstacles: Obstacle[];
  surfaces: SurfaceZone[];
  hammers?: HammerHazard[];
}

export interface BallState {
  pos: Vec2;
  vel: Vec2;
  lastSafePos: Vec2;
  moving: boolean;
}

export interface RoundResult {
  won: boolean;
  strokes: number;
}


export interface HoleResult {
  strokes: number;
  par: number;
  relation: "under" | "over" | "par";
}
