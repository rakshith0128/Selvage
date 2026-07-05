import { ClothingItem, OutfitLogEntry, ScoredOutfit } from './types';
import { OCCASIONS, WeatherId } from './constants';
import { scoreOutfit } from './scoring';

/**
 * Generates and ranks candidate outfits for a given occasion + weather.
 * Hard filters (formality range, warmth vs weather) run first; everything
 * that passes gets scored and the top 5 are returned.
 */
export function generateCandidates(
  items: ClothingItem[],
  history: OutfitLogEntry[],
  occasionId: string,
  weather: WeatherId,
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
    items.filter((i) => i.category === cat && passFormality(i) && passWarmth(i));

  const tops = pool('top');
  const bottoms = pool('bottom');
  const shoes = pool('shoe');
  const needsOuter = weather === 'cold';
  const outers = needsOuter
    ? items.filter((i) => i.category === 'outerwear' && passFormality(i) && i.warmth >= 3)
    : [];

  if (!tops.length || !bottoms.length || !shoes.length || (needsOuter && !outers.length)) {
    return [];
  }

  const combos: ClothingItem[][] = [];
  for (const t of tops) {
    for (const b of bottoms) {
      for (const s of shoes) {
        if (needsOuter) {
          for (const o of outers) combos.push([t, b, s, o]);
        } else {
          combos.push([t, b, s]);
        }
      }
    }
  }

  const filtered = anchorId ? combos.filter((c) => c.some((i) => i.id === anchorId)) : combos;

  return filtered
    .map((c) => scoreOutfit(c, history))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}
