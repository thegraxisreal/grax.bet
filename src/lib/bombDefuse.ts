const TOTAL_WIRES = 6;

export function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  const kk = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < kk; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

// Promotional high-payout curve:
// 1st safe cut = 5x, 2nd = 15x, then continues 3x per additional safe cut.
export function multiplierAt(_bombCount: number, cuts: number): number {
  if (cuts <= 0) return 1;
  const maxCuts = TOTAL_WIRES - 1;
  const normalizedCuts = Math.min(cuts, maxCuts);
  const mult = 5 * Math.pow(3, normalizedCuts - 1);
  return Math.round(mult * 100) / 100;
}

export function placeBombs(count: number): boolean[] {
  const indices = Array.from({ length: TOTAL_WIRES }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const bombs = Array(TOTAL_WIRES).fill(false);
  for (let i = 0; i < count; i++) bombs[indices[i]] = true;
  return bombs;
}
