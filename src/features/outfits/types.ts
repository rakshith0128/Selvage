export type Category = 'top' | 'bottom' | 'shoe' | 'outerwear' | 'accessory';
export type Pattern = 'solid' | 'pattern';
export type ColorKey =
  | 'white'
  | 'black'
  | 'charcoal'
  | 'cream'
  | 'navy'
  | 'denim'
  | 'olive'
  | 'burgundy'
  | 'rust';

export interface ClothingItem {
  id: string;
  name: string;
  category: Category;
  color: ColorKey;
  formality: 1 | 2 | 3 | 4;
  warmth: 1 | 2 | 3 | 4 | 5;
  pattern: Pattern;
  /** ISO date string of when the item was last worn, or null if never worn */
  lastWornDate: string | null;
  photoUri?: string | null;
}

export interface OutfitLogEntry {
  id: string;
  itemIds: string[];
  occasion: string;
  /** ISO datetime string */
  wornAt: string;
}

export interface ScoredOutfit {
  items: ClothingItem[];
  total: number;
  colorHarmony: number;
  formalityCoherence: number;
  novelty: number;
  neglectBonus: number;
}
