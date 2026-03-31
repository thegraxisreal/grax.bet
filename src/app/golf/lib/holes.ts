import { HoleConfig } from "./types";

export const HOLES: HoleConfig[] = [
  {
    id: "retro-bend-1",
    name: "Retro Bend",
    width: 900,
    height: 540,
    par: 3,
    tee: { x: 110, y: 430 },
    cup: { x: 760, y: 130 },
    cupRadius: 14,
    ballRadius: 9,
    maxStrokes: 10,
    walls: [
      { from: { x: 28, y: 28 }, to: { x: 872, y: 28 } },
      { from: { x: 872, y: 28 }, to: { x: 872, y: 512 } },
      { from: { x: 872, y: 512 }, to: { x: 28, y: 512 } },
      { from: { x: 28, y: 512 }, to: { x: 28, y: 28 } },
      { from: { x: 270, y: 140 }, to: { x: 270, y: 420 } },
      { from: { x: 270, y: 140 }, to: { x: 430, y: 140 } },
      { from: { x: 430, y: 140 }, to: { x: 430, y: 270 } },
      { from: { x: 520, y: 320 }, to: { x: 760, y: 320 } },
    ],
    obstacles: [
      { id: "pillar-a", type: "circle", center: { x: 515, y: 220 }, radius: 26, bounce: 0.93 },
      { id: "block-b", type: "rect", x: 625, y: 375, w: 80, h: 55, bounce: 0.88 },
    ],
    surfaces: [
      { id: "fairway", kind: "fairway", x: 35, y: 35, w: 830, h: 470, friction: 0.988 },
      { id: "rough-left", kind: "rough", x: 35, y: 35, w: 220, h: 470, friction: 0.974 },
      { id: "sand-trap", kind: "sand", x: 675, y: 68, w: 140, h: 90, friction: 0.956 },
      { id: "water", kind: "water", x: 565, y: 405, w: 170, h: 92, friction: 0.96 },
    ],
  },
];

export const DEFAULT_HOLE = HOLES[0];
