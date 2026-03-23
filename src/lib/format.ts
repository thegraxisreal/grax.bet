/**
 * Format a dollar amount with compact suffixes for large values.
 * < 1M:  normal 2-decimal  → "$1,234.56" style (just "1234.56" returned, caller adds $)
 * ≥ 1M:  "1.5M", "400M"
 * ≥ 1B:  "1B", "2.5B"
 * ≥ 1T:  "1T", "234543T"
 */
function compact(n: number, divisor: number, suffix: string): string {
  const val = n / divisor;
  // Up to 2 decimal places, no trailing zeros
  const s = val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(2)).toString();
  return s + suffix;
}

export function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return compact(n, 1e12, "T");
  if (abs >= 1e9)  return compact(n, 1e9,  "B");
  if (abs >= 1e6)  return compact(n, 1e6,  "M");
  return n.toFixed(2);
}

/** Prepends $ and handles negative sign correctly: -$1.23 not $-1.23 */
export function fmtDollar(n: number): string {
  if (n < 0) return `-$${fmtMoney(-n)}`;
  return `$${fmtMoney(n)}`;
}
