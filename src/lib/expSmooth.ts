/** Frame-rate-independent exponential smoothing (1-pole low-pass). */
export function expSmooth(
  current: number,
  target: number,
  deltaSec: number,
  attackRate: number,
  releaseRate: number,
): number {
  const rate = target > current ? attackRate : releaseRate;
  const dt = Math.min(0.05, Math.max(0.001, deltaSec));
  const alpha = 1 - Math.exp(-rate * dt);
  return current + (target - current) * alpha;
}
