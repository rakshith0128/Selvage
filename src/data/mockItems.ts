import { ClothingItem } from '../features/outfits/types';

function daysAgo(n: number | null): string | null {
  if (n === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_ITEMS: ClothingItem[] = [
  // tops
  { id: 't1', name: 'White oxford shirt', category: 'top', color: 'white', formality: 3, warmth: 2, pattern: 'solid', lastWornDate: daysAgo(2) },
  { id: 't2', name: 'Navy tee', category: 'top', color: 'navy', formality: 1, warmth: 1, pattern: 'solid', lastWornDate: daysAgo(6) },
  { id: 't3', name: 'Black turtleneck', category: 'top', color: 'black', formality: 2, warmth: 3, pattern: 'solid', lastWornDate: daysAgo(42) },
  { id: 't4', name: 'Olive henley', category: 'top', color: 'olive', formality: 1, warmth: 2, pattern: 'solid', lastWornDate: daysAgo(9) },
  { id: 't5', name: 'Burgundy sweater', category: 'top', color: 'burgundy', formality: 2, warmth: 4, pattern: 'solid', lastWornDate: daysAgo(58) },
  { id: 't6', name: 'Denim shirt', category: 'top', color: 'denim', formality: 1, warmth: 2, pattern: 'solid', lastWornDate: daysAgo(18) },
  { id: 't7', name: 'Cream striped shirt', category: 'top', color: 'cream', formality: 2, warmth: 2, pattern: 'pattern', lastWornDate: daysAgo(25) },

  // bottoms
  { id: 'b1', name: 'Dark denim jeans', category: 'bottom', color: 'denim', formality: 1, warmth: 2, pattern: 'solid', lastWornDate: daysAgo(3) },
  { id: 'b2', name: 'Charcoal trousers', category: 'bottom', color: 'charcoal', formality: 3, warmth: 2, pattern: 'solid', lastWornDate: daysAgo(7) },
  { id: 'b3', name: 'Khaki chinos', category: 'bottom', color: 'cream', formality: 2, warmth: 2, pattern: 'solid', lastWornDate: daysAgo(14) },
  { id: 'b4', name: 'Black formal trousers', category: 'bottom', color: 'black', formality: 4, warmth: 2, pattern: 'solid', lastWornDate: daysAgo(51) },
  { id: 'b5', name: 'Olive cargo pants', category: 'bottom', color: 'olive', formality: 1, warmth: 2, pattern: 'solid', lastWornDate: daysAgo(29) },

  // shoes
  { id: 's1', name: 'White sneakers', category: 'shoe', color: 'white', formality: 1, warmth: 1, pattern: 'solid', lastWornDate: daysAgo(2) },
  { id: 's2', name: 'Brown leather oxfords', category: 'shoe', color: 'rust', formality: 3, warmth: 1, pattern: 'solid', lastWornDate: daysAgo(38) },
  { id: 's3', name: 'Black boots', category: 'shoe', color: 'black', formality: 2, warmth: 3, pattern: 'solid', lastWornDate: daysAgo(11) },
  { id: 's4', name: 'Black dress shoes', category: 'shoe', color: 'black', formality: 4, warmth: 1, pattern: 'solid', lastWornDate: daysAgo(66) },
  { id: 's5', name: 'Rust suede loafers', category: 'shoe', color: 'rust', formality: 3, warmth: 1, pattern: 'solid', lastWornDate: daysAgo(null) },

  // outerwear
  { id: 'o1', name: 'Navy wool coat', category: 'outerwear', color: 'navy', formality: 3, warmth: 5, pattern: 'solid', lastWornDate: daysAgo(22) },
  { id: 'o2', name: 'Denim jacket', category: 'outerwear', color: 'denim', formality: 1, warmth: 2, pattern: 'solid', lastWornDate: daysAgo(9) },
  { id: 'o3', name: 'Charcoal blazer', category: 'outerwear', color: 'charcoal', formality: 4, warmth: 3, pattern: 'solid', lastWornDate: daysAgo(49) },
];
