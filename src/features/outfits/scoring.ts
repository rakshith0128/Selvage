import { ClothingItem, OutfitLogEntry, ScoredOutfit } from './types';
import { COLORS } from './constants';
import { DEFAULT_MODEL, LearnedModel } from './learning';

export function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / 86400000);
}

/** Scores 0-1: how well the colors in this outfit work together. Neutrals
 * (white/black/charcoal/cream) are treated as wildcards that pair with anything. */
export function colorHarmony(items: ClothingItem[]): number {
  const chromatic = items.filter((i) => COLORS[i.color].hue !== null);
  let base: number;

  if (chromatic.length <= 1) {
    base = 0.95;
  } else {
    let total = 0;
    let count = 0;
    for (let a = 0; a < chromatic.length; a++) {
      for (let b = a + 1; b < chromatic.length; b++) {
        let diff = Math.abs(COLORS[chromatic[a].color].hue! - COLORS[chromatic[b].color].hue!);
        if (diff > 180) diff = 360 - diff;

        let s: number;
        if (diff <= 40) s = 0.85; // analogous
        else if (diff >= 140) s = 0.8; // complementary
        else if (diff >= 80 && diff < 120) s = 0.5; // triadic-ish, moderate
        else s = 0.3; // clash zone

        total += s;
        count++;
      }
    }
    base = count ? total / count : 0.9;
  }

  const patterned = items.filter((i) => i.pattern === 'pattern').length;
  if (patterned >= 2) base *= 0.6; // two+ bold patterns clash

  return base;
}

/** Scores 0-1: penalizes mixing very different formality levels (e.g. gym sneakers + blazer). */
export function formalityCoherence(items: ClothingItem[]): number {
  const fs = items.map((i) => i.formality);
  const spread = Math.max(...fs) - Math.min(...fs);
  return Math.max(0, 1 - spread / 3);
}

/** Scores 0-1: rewards items that haven't been worn recently — this is what
 * surfaces forgotten pieces instead of always suggesting the same favorites. */
export function neglectBonus(items: ClothingItem[]): number {
  const vals = items.map((i) => {
    const d = daysSince(i.lastWornDate);
    return d === null ? 1 : Math.min(d / 60, 1);
  });
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Scores 0-1: penalizes repeating recently worn combinations. Jaccard overlap
 * (shared / union) so adding an accessory to yesterday's outfit can't dodge the
 * penalty, with a 1-week half-life so old repeats fade. */
export function noveltyScore(items: ClothingItem[], history: OutfitLogEntry[]): number {
  if (!history.length) return 1;

  let worstOverlap = 0;
  for (const entry of history.slice(-10)) {
    const shared = items.filter((i) => entry.itemIds.includes(i.id)).length;
    const union = new Set([...items.map((i) => i.id), ...entry.itemIds]).size;
    const jaccard = union ? shared / union : 0;

    const age = daysSince(entry.wornAt) ?? 0;
    const overlap = jaccard * Math.pow(0.5, Math.max(age, 0) / 7);
    if (overlap > worstOverlap) worstOverlap = overlap;
  }
  return 1 - worstOverlap;
}

/** Per-outfit taste in [0,1]; the store supplies one backed by learned item
 * stats + Thompson sampling. Defaults to the cold-start neutral value. */
export type TasteFn = (items: ClothingItem[]) => number;
const NEUTRAL_TASTE: TasteFn = () => 0.5;

export function scoreOutfit(
  items: ClothingItem[],
  history: OutfitLogEntry[],
  weights: LearnedModel['w'] = DEFAULT_MODEL.w,
  tasteFn: TasteFn = NEUTRAL_TASTE
): ScoredOutfit {
  const colorH = colorHarmony(items);
  const formalityC = formalityCoherence(items);
  const novelty = noveltyScore(items, history);
  const neglect = neglectBonus(items);
  const taste = tasteFn(items);

  return {
    items,
    total:
      weights[0] * colorH +
      weights[1] * formalityC +
      weights[2] * novelty +
      weights[3] * neglect +
      weights[4] * taste,
    colorHarmony: colorH,
    formalityCoherence: formalityC,
    novelty,
    neglectBonus: neglect,
    taste,
  };
}

/** Picks the biggest weighted contributor to explain a suggestion in plain language. */
export function explainOutfit(
  sc: ScoredOutfit,
  weights: LearnedModel['w'] = DEFAULT_MODEL.w
): string {
  const entries: [string, number][] = [
    ['a clean color pairing', weights[0] * sc.colorHarmony],
    ['it fits the occasion well', weights[1] * sc.formalityCoherence],
    ["it's a bit different from recent days", weights[2] * sc.novelty],
    ['it brings back something you forgot you owned', weights[3] * sc.neglectBonus],
    ["you've loved these pieces before", weights[4] * sc.taste],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}
