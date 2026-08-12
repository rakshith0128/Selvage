import { describe, it, expect } from 'vitest';
import { generateCandidates } from '../candidates';
import { noveltyScore, scoreOutfit } from '../scoring';
import { ClothingItem, OutfitLogEntry } from '../types';

let seq = 0;
function mk(
  category: ClothingItem['category'],
  overrides: Partial<ClothingItem> = {}
): ClothingItem {
  seq++;
  return {
    id: `item-${seq}`,
    name: `${category} ${seq}`,
    category,
    color: 'black',
    formality: 2,
    warmth: 2,
    pattern: 'solid',
    lastWornDate: null,
    ...overrides,
  };
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400000 - 60000).toISOString();
}

describe('generateCandidates — accessory slot', () => {
  it('offers outfits both with and without an accessory', () => {
    const acc = mk('accessory');
    const items = [mk('top'), mk('top'), mk('bottom'), mk('bottom'), mk('shoe'), mk('shoe'), acc];
    const result = generateCandidates(items, [], 'work', 'mild');

    expect(result.length).toBeGreaterThan(0);
    const withAcc = result.filter((o) => o.items.some((i) => i.id === acc.id));
    const withoutAcc = result.filter((o) => !o.items.some((i) => i.id === acc.id));
    expect(withAcc.length).toBeGreaterThan(0);
    expect(withoutAcc.length).toBeGreaterThan(0);
  });

  it('an accessory anchor forces the accessory into every outfit', () => {
    const acc = mk('accessory');
    const items = [mk('top'), mk('bottom'), mk('shoe'), acc, mk('accessory')];
    const result = generateCandidates(items, [], 'work', 'mild', undefined, undefined, acc.id);

    expect(result.length).toBeGreaterThan(0);
    for (const o of result) {
      expect(o.items.some((i) => i.id === acc.id)).toBe(true);
    }
  });

  it('excludes accessories that fail the warmth filter', () => {
    const scarf = mk('accessory', { warmth: 4 });
    const items = [mk('top'), mk('bottom'), mk('shoe'), scarf];
    const result = generateCandidates(items, [], 'work', 'warm');

    expect(result.length).toBeGreaterThan(0);
    for (const o of result) {
      expect(o.items.some((i) => i.id === scarf.id)).toBe(false);
    }
  });

  it('non-accessory anchor still filters combos', () => {
    const favTop = mk('top');
    const items = [favTop, mk('top'), mk('bottom'), mk('shoe'), mk('accessory')];
    const result = generateCandidates(items, [], 'work', 'mild', undefined, undefined, favTop.id);

    expect(result.length).toBeGreaterThan(0);
    for (const o of result) {
      expect(o.items.some((i) => i.id === favTop.id)).toBe(true);
    }
  });
});

describe('generateCandidates — cold start matches the old engine', () => {
  it('default model totals are an order-preserving transform of the old formula', () => {
    // Varied closet so sub-scores actually differ between combos.
    const items = [
      mk('top', { color: 'navy', formality: 2 }),
      mk('top', { color: 'rust', formality: 3, pattern: 'pattern' }),
      mk('bottom', { color: 'olive', formality: 2 }),
      mk('bottom', { color: 'charcoal', formality: 3 }),
      mk('shoe', { color: 'black', formality: 2, lastWornDate: daysAgoIso(3) }),
      mk('shoe', { color: 'burgundy', formality: 3 }),
    ];
    const result = generateCandidates(items, [], 'work', 'mild');

    expect(result.length).toBeGreaterThan(0);
    for (const o of result) {
      const oldTotal =
        0.4 * o.colorHarmony +
        0.25 * o.formalityCoherence +
        0.15 * o.novelty +
        0.2 * o.neglectBonus;
      // new = 0.8·old + 0.2·0.5 — affine, so ranking is identical to the old engine
      expect(o.total).toBeCloseTo(0.8 * oldTotal + 0.1, 9);
      expect(o.taste).toBe(0.5);
    }
    // Sorted descending
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].total).toBeGreaterThanOrEqual(result[i].total);
    }
  });
});

describe('generateCandidates — caps and scale', () => {
  it('handles a large closet quickly and returns the pool size', () => {
    const items: ClothingItem[] = [];
    for (let i = 0; i < 30; i++) items.push(mk('top'));
    for (let i = 0; i < 30; i++) items.push(mk('bottom'));
    for (let i = 0; i < 30; i++) items.push(mk('shoe'));

    const start = Date.now();
    const result = generateCandidates(items, [], 'work', 'mild');
    expect(Date.now() - start).toBeLessThan(2000);
    expect(result.length).toBe(12);
  });
});

describe('noveltyScore — Jaccard + decay', () => {
  const top = mk('top');
  const bottom = mk('bottom');
  const shoe = mk('shoe');
  const acc = mk('accessory');
  const outfit = [top, bottom, shoe];
  const entry = (days: number): OutfitLogEntry => ({
    id: 'h1',
    itemIds: [top.id, bottom.id, shoe.id],
    occasion: 'work',
    wornAt: daysAgoIso(days),
  });

  it('an exact repeat of yesterday scores very low', () => {
    expect(noveltyScore(outfit, [entry(1)])).toBeLessThan(0.15);
  });

  it('the same repeat a month later has mostly recovered', () => {
    expect(noveltyScore(outfit, [entry(30)])).toBeGreaterThan(0.9);
  });

  it('padding yesterday\'s outfit with an accessory cannot dodge the penalty', () => {
    expect(noveltyScore([...outfit, acc], [entry(1)])).toBeLessThan(0.4);
  });

  it('looks further back than the old 2-entry window', () => {
    const filler: OutfitLogEntry[] = Array.from({ length: 5 }, (_, i) => ({
      id: `f${i}`,
      itemIds: ['other-a', 'other-b', 'other-c'],
      occasion: 'work',
      wornAt: daysAgoIso(1),
    }));
    // Repeat sits 6 entries back — the old slice(-2) would have missed it.
    const history = [entry(2), ...filler];
    expect(noveltyScore(outfit, history)).toBeLessThan(0.3);
  });
});

describe('scoreOutfit — learned weights', () => {
  it('uses the supplied weights and taste function', () => {
    const items = [mk('top'), mk('bottom'), mk('shoe')];
    const sc = scoreOutfit(items, [], [0.02, 0.02, 0.02, 0.02, 0.92], () => 1);
    expect(sc.taste).toBe(1);
    expect(sc.total).toBeGreaterThan(0.9);
  });
});
