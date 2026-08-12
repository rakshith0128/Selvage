import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MODEL,
  FeatureVector,
  LearnedModel,
  betaSample,
  deriveItemStats,
  mulberry32,
  sgdUpdate,
  tasteForItem,
  validateModel,
} from '../learning';
import { softmaxPick, pickOutfit, outfitKey } from '../selection';
import { ClothingItem, ScoredOutfit } from '../types';

const sumW = (m: LearnedModel) => m.w.reduce((a, b) => a + b, 0);

const features = (overrides: Partial<FeatureVector> = {}): FeatureVector => ({
  colorHarmony: 0.5,
  formalityCoherence: 0.5,
  novelty: 0.5,
  neglectBonus: 0.5,
  taste: 0.5,
  ...overrides,
});

describe('sgdUpdate', () => {
  it('keeps weights normalized to sum 1', () => {
    let m = DEFAULT_MODEL;
    m = sgdUpdate(m, features({ colorHarmony: 0.9 }), 'like');
    m = sgdUpdate(m, features({ novelty: 0.9 }), 'dislike');
    expect(sumW(m)).toBeCloseTo(1, 9);
  });

  it('positive feedback raises the relative weight of the dominant feature', () => {
    // Outfit scored high on taste, low elsewhere; user loves it repeatedly.
    let m = DEFAULT_MODEL;
    const x = features({ taste: 0.95, colorHarmony: 0.2 });
    for (let i = 0; i < 30; i++) m = sgdUpdate(m, x, 'like');
    expect(m.w[4]).toBeGreaterThan(DEFAULT_MODEL.w[4]);
    expect(m.w[0]).toBeLessThan(DEFAULT_MODEL.w[0]);
  });

  it('negative feedback lowers the relative weight of the dominant feature', () => {
    let m = DEFAULT_MODEL;
    const x = features({ colorHarmony: 0.95, taste: 0.2 });
    for (let i = 0; i < 30; i++) m = sgdUpdate(m, x, 'dislike');
    expect(m.w[0]).toBeLessThan(DEFAULT_MODEL.w[0]);
  });

  it('weight floor holds under 200 adversarial negative updates', () => {
    let m = DEFAULT_MODEL;
    const x = features({ colorHarmony: 1, formalityCoherence: 0, novelty: 0, neglectBonus: 0, taste: 0 });
    for (let i = 0; i < 200; i++) m = sgdUpdate(m, x, 'dislike');
    for (const w of m.w) expect(w).toBeGreaterThanOrEqual(0.02 / (1 + 4 * 0.02));
    expect(sumW(m)).toBeCloseTo(1, 9);
    expect(m.w[0]).toBeLessThan(0.1);
  });

  it('bias stays clamped to [-2, 2]', () => {
    let m = DEFAULT_MODEL;
    for (let i = 0; i < 500; i++) m = sgdUpdate(m, features(), 'dislike');
    expect(m.b).toBeGreaterThanOrEqual(-2);
    expect(m.b).toBeLessThanOrEqual(2);
  });

  it('shuffle moves weights far less than dislike', () => {
    const x = features({ colorHarmony: 0.95 });
    const afterShuffle = sgdUpdate(DEFAULT_MODEL, x, 'shuffle');
    const afterDislike = sgdUpdate(DEFAULT_MODEL, x, 'dislike');
    const delta = (m: LearnedModel) => Math.abs(m.w[0] - DEFAULT_MODEL.w[0]);
    expect(delta(afterShuffle)).toBeLessThan(delta(afterDislike));
  });
});

describe('betaSample / tasteForItem', () => {
  it('samples Beta(6,2) with mean near 0.75, all values in [0,1]', () => {
    const rng = mulberry32(42);
    let total = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) {
      const v = betaSample(5, 1, rng); // Beta(1+5, 1+1)
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      total += v;
    }
    expect(total / n).toBeGreaterThan(0.72);
    expect(total / n).toBeLessThan(0.78);
  });

  it('items with no feedback get exactly the neutral 0.5', () => {
    const rng = mulberry32(1);
    expect(tasteForItem(undefined, rng)).toBe(0.5);
    expect(tasteForItem({ positives: 0, negatives: 0 }, rng)).toBe(0.5);
  });

  it('a loved item usually outscores a disliked one', () => {
    const rng = mulberry32(7);
    let lovedWins = 0;
    for (let i = 0; i < 500; i++) {
      const loved = tasteForItem({ positives: 8, negatives: 1 }, rng);
      const disliked = tasteForItem({ positives: 1, negatives: 8 }, rng);
      if (loved > disliked) lovedWins++;
    }
    expect(lovedWins).toBeGreaterThan(450);
  });
});

describe('deriveItemStats', () => {
  it('attributes credit per action type', () => {
    const stats = deriveItemStats([
      { item_ids: ['a', 'b'], action: 'wear' },
      { item_ids: ['a'], action: 'dislike' },
      { item_ids: ['b'], action: 'shuffle' },
    ]);
    expect(stats.get('a')).toEqual({ positives: 1, negatives: 1 });
    expect(stats.get('b')).toEqual({ positives: 1, negatives: 0.25 });
  });
});

describe('softmaxPick / pickOutfit', () => {
  it('is reproducible with a seeded RNG', () => {
    const scores = [0.6, 0.65, 0.55];
    const a = softmaxPick(scores, 0.06, mulberry32(9));
    const b = softmaxPick(scores, 0.06, mulberry32(9));
    expect(a).toBe(b);
  });

  it('near-zero temperature approaches argmax', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 100; i++) {
      expect(softmaxPick([0.4, 0.9, 0.5], 0.001, rng)).toBe(1);
    }
  });

  it('picks higher-scored outfits more often at working temperature', () => {
    const rng = mulberry32(11);
    const counts = [0, 0];
    for (let i = 0; i < 5000; i++) counts[softmaxPick([0.8, 0.68], 0.06, rng)]++;
    expect(counts[0]).toBeGreaterThan(counts[1] * 3);
  });

  it('pickOutfit skips skipped keys and falls back when all are skipped', () => {
    const mk = (id: string): ScoredOutfit => ({
      items: [{ id } as ClothingItem],
      total: 0.5,
      colorHarmony: 0.5,
      formalityCoherence: 0.5,
      novelty: 0.5,
      neglectBonus: 0.5,
      taste: 0.5,
    });
    const pool = [mk('x'), mk('y')];
    const rng = mulberry32(5);

    const picked = pickOutfit(pool, [outfitKey(pool[0].items)], 0.06, rng);
    expect(picked && outfitKey(picked.items)).toBe('y');

    const fallback = pickOutfit(pool, ['x', 'y'], 0.06, rng);
    expect(fallback).not.toBeNull();
  });
});

describe('validateModel', () => {
  it('falls back to default on garbage', () => {
    expect(validateModel(null)).toEqual(DEFAULT_MODEL);
    expect(validateModel({ w: [1, 2] })).toEqual(DEFAULT_MODEL);
    expect(validateModel({ version: 2, w: [0.2, 0.2, 0.2, 0.2, 0.2], b: 0 })).toEqual(DEFAULT_MODEL);
    expect(validateModel({ version: 1, w: [0.2, 0.2, 0.2, 0.2, NaN], b: 0 })).toEqual(DEFAULT_MODEL);
  });

  it('round-trips a valid model', () => {
    const m = validateModel({ version: 1, w: [0.3, 0.2, 0.1, 0.2, 0.2], b: -0.5 });
    expect(sumW(m)).toBeCloseTo(1, 9);
    expect(m.b).toBe(-0.5);
  });
});
