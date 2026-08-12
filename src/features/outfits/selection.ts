// Picks which candidate outfit to present. Sampling (instead of always the
// top score) is what keeps suggestions from repeating; pure + injectable RNG.

import { ClothingItem, ScoredOutfit } from './types';
import { Rng } from './learning';

// At T=0.06 a 0.06 score gap ≈ e ≈ 2.7x preference: the best pick still
// dominates, near-ties get real variety.
export const SOFTMAX_TEMPERATURE = 0.06;

/** Stable identity for an outfit regardless of item order. */
export function outfitKey(items: ClothingItem[]): string {
  return items
    .map((i) => i.id)
    .sort()
    .join('|');
}

/** Samples an index with probability ∝ exp(score/T). */
export function softmaxPick(scores: number[], temperature: number, rng: Rng): number {
  if (!scores.length) return -1;
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);

  let r = rng() * sum;
  for (let i = 0; i < exps.length; i++) {
    r -= exps[i];
    if (r <= 0) return i;
  }
  return exps.length - 1;
}

/**
 * Samples an outfit from the pool, avoiding outfits skipped this session.
 * When everything has been skipped, the skip list is treated as exhausted
 * and the whole pool is fair game again (caller may clear its own list).
 */
export function pickOutfit(
  pool: ScoredOutfit[],
  skippedKeys: string[],
  temperature: number,
  rng: Rng
): ScoredOutfit | null {
  if (!pool.length) return null;

  const skipped = new Set(skippedKeys);
  let eligible = pool.filter((o) => !skipped.has(outfitKey(o.items)));
  if (!eligible.length) eligible = pool;

  const idx = softmaxPick(
    eligible.map((o) => o.total),
    temperature,
    rng
  );
  return eligible[idx] ?? null;
}
