import { HoleConfig } from "./types";

const W = 960;
const H = 540;

function baseWalls() {
  return [
    { from: { x: 24, y: 24 }, to: { x: W - 24, y: 24 } },
    { from: { x: W - 24, y: 24 }, to: { x: W - 24, y: H - 24 } },
    { from: { x: W - 24, y: H - 24 }, to: { x: 24, y: H - 24 } },
    { from: { x: 24, y: H - 24 }, to: { x: 24, y: 24 } },
  ];
}

export const HOLES: HoleConfig[] = [
  {
    id: "level-1", name: "Level 1", par: 3, multiplier: 1.2, width: W, height: H,
    tee: { x: 90, y: 430 }, cup: { x: 820, y: 120 }, cupRadius: 14, ballRadius: 9, maxStrokes: 10,
    theme: { bg: "#0d3f26", fairway: "#1f6b3a", rough: "#19552d", sand: "#ad8a53", lava: "#d9480f", wall: "#4b5563" },
    walls: [...baseWalls(), { from: { x: 290, y: 170 }, to: { x: 420, y: 170 } }, { from: { x: 420, y: 170 }, to: { x: 420, y: 320 } }],
    obstacles: [{ id: "o1", type: "circle", center: { x: 560, y: 260 }, radius: 24 }],
    surfaces: [{ id: "f", kind: "fairway", x: 30, y: 30, w: 900, h: 480, friction: 0.973 }, { id: "r", kind: "rough", x: 30, y: 30, w: 220, h: 480, friction: 0.948 }],
  },
  {
    id: "level-2", name: "Level 2", par: 3, multiplier: 1.35, width: W, height: H,
    tee: { x: 100, y: 100 }, cup: { x: 830, y: 430 }, cupRadius: 14, ballRadius: 9, maxStrokes: 10,
    theme: { bg: "#0d3f26", fairway: "#2a7b43", rough: "#165436", sand: "#b68c55", lava: "#e4572e", wall: "#5b6472" },
    walls: [...baseWalls(), { from: { x: 210, y: 300 }, to: { x: 760, y: 300 } }],
    obstacles: [{ id: "o2", type: "rect", x: 465, y: 170, w: 70, h: 90 }],
    surfaces: [{ id: "f", kind: "fairway", x: 30, y: 30, w: 900, h: 480, friction: 0.97 }],
  },
  {
    id: "level-3", name: "Level 3", par: 4, multiplier: 1.5, width: W, height: H,
    tee: { x: 90, y: 430 }, cup: { x: 840, y: 80 }, cupRadius: 14, ballRadius: 9, maxStrokes: 10,
    theme: { bg: "#0b472e", fairway: "#26834b", rough: "#14532d", sand: "#c09558", lava: "#f15a24", wall: "#6b7280" },
    walls: [...baseWalls(), { from: { x: 300, y: 120 }, to: { x: 300, y: 430 } }, { from: { x: 300, y: 120 }, to: { x: 520, y: 120 } }, { from: { x: 600, y: 220 }, to: { x: 860, y: 220 } }],
    obstacles: [{ id: "o3", type: "circle", center: { x: 630, y: 340 }, radius: 26 }],
    surfaces: [{ id: "f", kind: "fairway", x: 30, y: 30, w: 900, h: 480, friction: 0.968 }, { id: "sand", kind: "sand", x: 720, y: 40, w: 160, h: 90, friction: 0.91 }],
  },
  {
    id: "level-4", name: "Hammer Alley", par: 4, multiplier: 1.8, width: W, height: H,
    tee: { x: 90, y: 260 }, cup: { x: 860, y: 260 }, cupRadius: 14, ballRadius: 9, maxStrokes: 9,
    theme: { bg: "#382f57", fairway: "#6d5ca1", rough: "#4e3f78", sand: "#9f89d4", lava: "#f97316", wall: "#8b90a3" },
    walls: [...baseWalls(), { from: { x: 270, y: 90 }, to: { x: 270, y: 450 } }, { from: { x: 530, y: 90 }, to: { x: 530, y: 450 } }],
    obstacles: [],
    surfaces: [{ id: "f", kind: "fairway", x: 30, y: 30, w: 900, h: 480, friction: 0.965 }],
    hammers: [
      { id: "h1", pivot: { x: 400, y: 190 }, armLength: 85, angleMin: -1.2, angleMax: 1.2, speed: 1.9, headRadius: 18 },
      { id: "h2", pivot: { x: 400, y: 350 }, armLength: 85, angleMin: 2.0, angleMax: 4.3, speed: 1.5, headRadius: 18 },
    ],
  },
  {
    id: "level-5", name: "Lava Lanes", par: 4, multiplier: 2.1, width: W, height: H,
    tee: { x: 80, y: 430 }, cup: { x: 860, y: 90 }, cupRadius: 14, ballRadius: 9, maxStrokes: 9,
    theme: { bg: "#2b1133", fairway: "#5b2a72", rough: "#3f1b51", sand: "#9270b2", lava: "#f43f5e", wall: "#9ca3af" },
    walls: [...baseWalls(), { from: { x: 260, y: 130 }, to: { x: 440, y: 130 } }, { from: { x: 440, y: 130 }, to: { x: 440, y: 360 } }, { from: { x: 650, y: 210 }, to: { x: 860, y: 210 } }],
    obstacles: [{ id: "o5", type: "rect", x: 530, y: 300, w: 85, h: 65 }],
    surfaces: [{ id: "f", kind: "fairway", x: 30, y: 30, w: 900, h: 480, friction: 0.962 }, { id: "lava", kind: "lava", x: 560, y: 380, w: 210, h: 90, friction: 0.93 }],
  },
  {
    id: "level-6", name: "Neon Pins", par: 5, multiplier: 2.4, width: W, height: H,
    tee: { x: 90, y: 90 }, cup: { x: 850, y: 430 }, cupRadius: 14, ballRadius: 9, maxStrokes: 9,
    theme: { bg: "#111827", fairway: "#2563eb", rough: "#1e40af", sand: "#7dd3fc", lava: "#ef4444", wall: "#94a3b8" },
    walls: [...baseWalls(), { from: { x: 310, y: 70 }, to: { x: 310, y: 470 } }, { from: { x: 620, y: 70 }, to: { x: 620, y: 470 } }, { from: { x: 310, y: 260 }, to: { x: 620, y: 260 } }],
    obstacles: [{ id: "n1", type: "circle", center: { x: 470, y: 180 }, radius: 22 }, { id: "n2", type: "circle", center: { x: 470, y: 340 }, radius: 22 }],
    surfaces: [{ id: "f", kind: "fairway", x: 30, y: 30, w: 900, h: 480, friction: 0.958 }],
  },
  {
    id: "level-7", name: "Hammer & Lava", par: 5, multiplier: 2.8, width: W, height: H,
    tee: { x: 90, y: 260 }, cup: { x: 860, y: 120 }, cupRadius: 14, ballRadius: 9, maxStrokes: 8,
    theme: { bg: "#1f2937", fairway: "#0ea5e9", rough: "#0369a1", sand: "#7dd3fc", lava: "#fb7185", wall: "#a1a1aa" },
    walls: [...baseWalls(), { from: { x: 250, y: 120 }, to: { x: 760, y: 120 } }, { from: { x: 250, y: 120 }, to: { x: 250, y: 420 } }, { from: { x: 510, y: 250 }, to: { x: 860, y: 250 } }],
    obstacles: [{ id: "b7", type: "rect", x: 365, y: 330, w: 90, h: 70 }],
    surfaces: [{ id: "f", kind: "fairway", x: 30, y: 30, w: 900, h: 480, friction: 0.955 }, { id: "lava", kind: "lava", x: 560, y: 390, w: 230, h: 80, friction: 0.9 }],
    hammers: [{ id: "h7", pivot: { x: 635, y: 340 }, armLength: 95, angleMin: -0.9, angleMax: 1.1, speed: 2.1, headRadius: 20 }],
  },
  {
    id: "level-8", name: "Chaos Purple", par: 5, multiplier: 3.3, width: W, height: H,
    tee: { x: 70, y: 470 }, cup: { x: 890, y: 70 }, cupRadius: 14, ballRadius: 9, maxStrokes: 8,
    theme: { bg: "#1e1b4b", fairway: "#6d28d9", rough: "#4c1d95", sand: "#a78bfa", lava: "#f97316", wall: "#c4b5fd" },
    walls: [...baseWalls(), { from: { x: 190, y: 130 }, to: { x: 450, y: 130 } }, { from: { x: 450, y: 130 }, to: { x: 450, y: 390 } }, { from: { x: 450, y: 390 }, to: { x: 760, y: 390 } }, { from: { x: 760, y: 220 }, to: { x: 760, y: 390 } }],
    obstacles: [{ id: "c8", type: "circle", center: { x: 590, y: 255 }, radius: 30 }],
    surfaces: [{ id: "f", kind: "fairway", x: 30, y: 30, w: 900, h: 480, friction: 0.953 }, { id: "lava", kind: "lava", x: 260, y: 430, w: 300, h: 60, friction: 0.88 }],
    hammers: [{ id: "h8", pivot: { x: 310, y: 290 }, armLength: 90, angleMin: -1.4, angleMax: 1.4, speed: 2.35, headRadius: 18 }],
  },
  {
    id: "level-9", name: "Finale: Inferno", par: 6, multiplier: 4.0, width: W, height: H,
    tee: { x: 70, y: 270 }, cup: { x: 890, y: 270 }, cupRadius: 14, ballRadius: 9, maxStrokes: 7,
    theme: { bg: "#111111", fairway: "#1f2937", rough: "#0f172a", sand: "#9ca3af", lava: "#ef4444", wall: "#d1d5db" },
    walls: [
      ...baseWalls(),
      { from: { x: 250, y: 70 }, to: { x: 250, y: 360 } },
      { from: { x: 420, y: 180 }, to: { x: 420, y: 470 } },
      { from: { x: 590, y: 70 }, to: { x: 590, y: 360 } },
      { from: { x: 760, y: 180 }, to: { x: 760, y: 470 } },
      { from: { x: 250, y: 360 }, to: { x: 360, y: 360 } },
      { from: { x: 420, y: 180 }, to: { x: 530, y: 180 } },
      { from: { x: 590, y: 360 }, to: { x: 700, y: 360 } },
      { from: { x: 760, y: 180 }, to: { x: 860, y: 180 } },
    ],
    obstacles: [
      { id: "f1", type: "circle", center: { x: 335, y: 270 }, radius: 24 },
      { id: "f2", type: "circle", center: { x: 675, y: 270 }, radius: 24 },
      { id: "f3", type: "rect", x: 500, y: 230, w: 70, h: 80 },
    ],
    surfaces: [
      { id: "f", kind: "fairway", x: 30, y: 30, w: 900, h: 480, friction: 0.952 },
      { id: "r-top", kind: "rough", x: 30, y: 30, w: 900, h: 95, friction: 0.935 },
      { id: "r-bottom", kind: "rough", x: 30, y: 415, w: 900, h: 95, friction: 0.935 },
      { id: "lava-a", kind: "lava", x: 305, y: 205, w: 120, h: 130, friction: 0.88 },
      { id: "lava-b", kind: "lava", x: 600, y: 205, w: 120, h: 130, friction: 0.88 },
    ],
    hammers: [
      { id: "h9a", pivot: { x: 470, y: 120 }, armLength: 85, angleMin: 0.35, angleMax: 2.5, speed: 2.3, headRadius: 18 },
      { id: "h9b", pivot: { x: 470, y: 420 }, armLength: 85, angleMin: -2.8, angleMax: -0.4, speed: 2.0, headRadius: 18 },
      { id: "h9c", pivot: { x: 845, y: 270 }, armLength: 75, angleMin: 2.1, angleMax: 4.2, speed: 2.5, headRadius: 18 },
    ],
  },
];

export const DEFAULT_HOLE = HOLES[0];
