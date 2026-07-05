import { Category, ColorKey } from './types';

export const COLORS: Record<ColorKey, { hex: string; hue: number | null; label: string }> = {
  white: { hex: '#F3F1EA', hue: null, label: 'White' },
  black: { hex: '#2B2926', hue: null, label: 'Black' },
  charcoal: { hex: '#4A473F', hue: null, label: 'Charcoal' },
  cream: { hex: '#E7DCC2', hue: null, label: 'Cream' },
  navy: { hex: '#2C3E50', hue: 220, label: 'Navy' },
  denim: { hex: '#4A6FA5', hue: 210, label: 'Denim' },
  olive: { hex: '#6B7A4A', hue: 80, label: 'Olive' },
  burgundy: { hex: '#7A2E2E', hue: 350, label: 'Burgundy' },
  rust: { hex: '#A85A34', hue: 20, label: 'Rust' },
};

export const FORMALITY_LABEL: Record<number, string> = {
  1: 'Casual',
  2: 'Smart casual',
  3: 'Business',
  4: 'Formal',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  top: 'Top',
  bottom: 'Bottom',
  shoe: 'Shoe',
  outerwear: 'Outerwear',
  accessory: 'Accessory',
};

export interface Occasion {
  id: string;
  label: string;
  minFormality: number;
  maxFormality: number;
}

export const OCCASIONS: Occasion[] = [
  { id: 'casual', label: 'Casual', minFormality: 1, maxFormality: 2 },
  { id: 'work', label: 'Work', minFormality: 2, maxFormality: 3 },
  { id: 'date', label: 'Date night', minFormality: 2, maxFormality: 3 },
  { id: 'formal', label: 'Formal event', minFormality: 3, maxFormality: 4 },
];

export type WeatherId = 'cold' | 'mild' | 'warm';

export const WEATHERS: { id: WeatherId; label: string }[] = [
  { id: 'cold', label: 'Cold' },
  { id: 'mild', label: 'Mild' },
  { id: 'warm', label: 'Warm' },
];
