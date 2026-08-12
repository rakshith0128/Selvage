import { ClothingItem, OutfitLogEntry, ScoredOutfit } from './types';
import { OCCASIONS, WeatherId } from './constants';
import { scoreOutfit, TasteFn, daysSince } from './scoring';
import { DEFAULT_MODEL, LearnedModel } from './learning';
import { outfitKey } from './selection';

// Caps keep the cartesian product cheap even for large closets.
const MAX_POOL_PER_CATEGORY = 25;
const MAX_CORE_COMBOS = 6000;
const CORE_KEEP = 40; // top core combos expanded with accessories
export const CANDIDATE_POOL_SIZE = 12;

/** When a category pool is oversized, keep the most neglected items — they're
 * the ones the app should be trying to surface anyway. */
function capPool(pool: ClothingItem[]): ClothingItem[] {
  if (pool.length <= MAX_POOL_PER_CATEGORY) return pool;
  return [...pool]
    .sort((a, b) => (daysSince(b.lastWornDate) ?? Infinity) - (daysSince(a.lastWornDate) ?? Infinity))
    .slice(0, MAX_POOL_PER_CATEGORY);
}

/**
 * Generates and ranks candidate outfits for a given occasion + weather.
 * Hard filters (formality range, warmth vs weather) run first. Core combos
 * (top+bottom+shoe, +outerwear when cold) are scored, then the best are
 * expanded with each eligible accessory as an optional extra slot — the
 * no-accessory variant stays in the running, so scoring decides.
 */
export function generateCandidates(
  items: ClothingItem[],
  history: OutfitLogEntry[],
  occasionId: string,
  weather: WeatherId,
  weights: LearnedModel['w'] = DEFAULT_MODEL.w,
  tasteFn?: TasteFn,
  anchorId?: string | null
): ScoredOutfit[] {
  const occasion = OCCASIONS.find((o) => o.id === occasionId);
  if (!occasion) return [];

  const passFormality = (i: ClothingItem) =>
    i.formality >= occasion.minFormality && i.formality <= occasion.maxFormality;

  const passWarmth = (i: ClothingItem) => {
    if (weather === 'warm') return i.warmth <= 3;
    if (weather === 'mild') return i.warmth <= 4;
    return true; // cold: no upper exclusion
  };

  const pool = (cat: ClothingItem['category']) =>
    capPool(items.filter((i) => i.category === cat && passFormality(i) && passWarmth(i)));

  const tops = pool('top');
  const bottoms = pool('bottom');
  const shoes = pool('shoe');
  const accessories = pool('accessory');
  const needsOuter = weather === 'cold';
  const outers = needsOuter
    ? capPool(items.filter((i) => i.category === 'outerwear' && passFormality(i) && i.warmth >= 3))
    : [];

  if (!tops.length || !bottoms.length || !shoes.length || (needsOuter && !outers.length)) {
    return [];
  }

  const combos: ClothingItem[][] = [];
  outer: for (const t of tops) {
    for (const b of bottoms) {
      for (const s of shoes) {
        if (needsOuter) {
          for (const o of outers) {
            combos.push([t, b, s, o]);
            if (combos.length >= MAX_CORE_COMBOS) break outer;
          }
        } else {
          combos.push([t, b, s]);
          if (combos.length >= MAX_CORE_COMBOS) break outer;
        }
      }
    }
  }

  // An accessory anchor can't match any core combo, so it's enforced in the
  // accessory expansion below instead.
  const anchorIsAccessory = !!anchorId && accessories.some((a) => a.id === anchorId);
  const filtered =
    anchorId && !anchorIsAccessory
      ? combos.filter((c) => c.some((i) => i.id === anchorId))
      : combos;

  const scoredCore = filtered
    .map((c) => scoreOutfit(c, history, weights, tasteFn))
    .sort((a, b) => b.total - a.total)
    .slice(0, CORE_KEEP);

  let expanded: ScoredOutfit[];
  if (!accessories.length) {
    if (anchorIsAccessory) return []; // anchor filtered out by occasion/weather
    expanded = scoredCore;
  } else {
    expanded = [];
    for (const core of scoredCore) {
      if (!anchorIsAccessory) expanded.push(core);
      for (const a of accessories) {
        if (anchorIsAccessory && a.id !== anchorId) continue;
        expanded.push(scoreOutfit([...core.items, a], history, weights, tasteFn));
      }
    }
  }

  const seen = new Set<string>();
  return expanded
    .sort((a, b) => b.total - a.total)
    .filter((o) => {
      const key = outfitKey(o.items);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, CANDIDATE_POOL_SIZE);
}
