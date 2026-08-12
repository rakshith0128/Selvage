// On-device learning for the recommendation engine. Pure math — no React
// Native or Supabase imports, so everything here is unit-testable in node.

export type Rng = () => number;

/** Small seeded PRNG for deterministic tests. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type FeedbackAction = 'wear' | 'like' | 'dislike' | 'shuffle';

/** All features live in [0,1]. Order matches LearnedModel.w. */
export interface FeatureVector {
  colorHarmony: number;
  formalityCoherence: number;
  novelty: number;
  neglectBonus: number;
  taste: number;
}

export const FEATURE_KEYS = [
  'colorHarmony',
  'formalityCoherence',
  'novelty',
  'neglectBonus',
  'taste',
] as const;

export interface LearnedModel {
  /** Weights over FEATURE_KEYS; kept non-negative and summing to 1. */
  w: [number, number, number, number, number];
  /** Bias: absorbs the base rate (skips outnumber wears). Constant across
   * candidates, so it calibrates probabilities without affecting ranking. */
  b: number;
  version: 1;
}

// Old fixed weights [0.4, 0.25, 0.15, 0.2] scaled by 0.8, taste gets 0.2.
// With no feedback taste is a constant 0.5, so cold-start ranking matches
// the original engine exactly.
export const DEFAULT_MODEL: LearnedModel = {
  w: [0.32, 0.2, 0.12, 0.16, 0.2],
  b: 0,
  version: 1,
};

// Signal strength: explicit taps > wear (positive but habitual) >> shuffle
// (people shuffle to browse, not to reject).
export const LEARNING_RATES: Record<FeedbackAction, number> = {
  like: 0.08,
  dislike: 0.08,
  wear: 0.05,
  shuffle: 0.015,
};

const WEIGHT_FLOOR = 0.02;
const BIAS_LIMIT = 2;
// Spreads the ~[0.3, 0.9] score range across the sigmoid's active region.
const LOGIT_SCALE = 4;

export function featureArray(x: FeatureVector): number[] {
  return FEATURE_KEYS.map((k) => x[k]);
}

/** Floors weights (so no factor dies), renormalizes to sum 1, clamps bias. */
export function clampAndRenormalize(model: LearnedModel): LearnedModel {
  const floored = model.w.map((w) => Math.max(w, WEIGHT_FLOOR));
  const sum = floored.reduce((a, b) => a + b, 0);
  return {
    w: floored.map((w) => w / sum) as LearnedModel['w'],
    b: Math.min(BIAS_LIMIT, Math.max(-BIAS_LIMIT, model.b)),
    version: 1,
  };
}

/**
 * One online logistic-regression step: worn/liked outfits pull weight toward
 * the features they scored high on; disliked/skipped ones push it away.
 */
export function sgdUpdate(
  model: LearnedModel,
  x: FeatureVector,
  action: FeedbackAction
): LearnedModel {
  const y = action === 'wear' || action === 'like' ? 1 : 0;
  const eta = LEARNING_RATES[action];
  const xs = featureArray(x);

  const z = LOGIT_SCALE * model.w.reduce((acc, w, j) => acc + w * xs[j], 0) + model.b;
  const p = 1 / (1 + Math.exp(-z));
  const err = p - y;

  return clampAndRenormalize({
    w: model.w.map((w, j) => w - eta * err * LOGIT_SCALE * xs[j]) as LearnedModel['w'],
    b: model.b - eta * err,
    version: 1,
  });
}

export interface ItemStats {
  positives: number;
  negatives: number;
}

/**
 * Thompson sample from Beta(1+positives, 1+negatives) via a clamped normal
 * approximation. We only need ranking noise proportional to uncertainty, not
 * exact tail shapes, so this stays a few lines instead of a Gamma sampler.
 */
export function betaSample(positives: number, negatives: number, rng: Rng): number {
  const a = 1 + positives;
  const b = 1 + negatives;
  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) * (a + b) * (a + b + 1));

  // Box–Muller; guard against log(0).
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  return Math.min(1, Math.max(0, mean + z * Math.sqrt(variance)));
}

/** Items with no feedback yet score a flat 0.5 so cold start stays neutral. */
export function tasteForItem(stats: ItemStats | undefined, rng: Rng): number {
  if (!stats || stats.positives + stats.negatives === 0) return 0.5;
  return betaSample(stats.positives, stats.negatives, rng);
}

// Feedback → per-item credit. Full attribution (each item gets the outfit's
// whole signal): fractional credit would make counts uselessly small at a few
// signals per day, and a genuinely bad item still accumulates negatives across
// many different outfits.
const FEEDBACK_CREDIT: Record<FeedbackAction, { positive: number; negative: number }> = {
  wear: { positive: 1, negative: 0 },
  like: { positive: 1, negative: 0 },
  dislike: { positive: 0, negative: 1 },
  shuffle: { positive: 0, negative: 0.25 },
};

export interface FeedbackRowLike {
  item_ids: string[];
  action: FeedbackAction;
}

export function deriveItemStats(rows: FeedbackRowLike[]): Map<string, ItemStats> {
  const stats = new Map<string, ItemStats>();
  for (const row of rows) {
    const credit = FEEDBACK_CREDIT[row.action];
    if (!credit) continue;
    for (const id of row.item_ids) {
      const s = stats.get(id) ?? { positives: 0, negatives: 0 };
      s.positives += credit.positive;
      s.negatives += credit.negative;
      stats.set(id, s);
    }
  }
  return stats;
}

/** Applies one feedback event to in-memory stats (mirror of deriveItemStats). */
export function bumpItemStats(
  stats: Map<string, ItemStats>,
  itemIds: string[],
  action: FeedbackAction
): void {
  const credit = FEEDBACK_CREDIT[action];
  for (const id of itemIds) {
    const s = stats.get(id) ?? { positives: 0, negatives: 0 };
    s.positives += credit.positive;
    s.negatives += credit.negative;
    stats.set(id, s);
  }
}

/** Validates a persisted model blob; anything off falls back to the default. */
export function validateModel(json: unknown): LearnedModel {
  const m = json as Partial<LearnedModel> | null;
  if (
    !m ||
    m.version !== 1 ||
    !Array.isArray(m.w) ||
    m.w.length !== 5 ||
    !m.w.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0) ||
    typeof m.b !== 'number' ||
    !Number.isFinite(m.b)
  ) {
    return DEFAULT_MODEL;
  }
  return clampAndRenormalize({ w: m.w as LearnedModel['w'], b: m.b, version: 1 });
}
