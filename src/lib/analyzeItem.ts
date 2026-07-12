import { supabase } from './supabase';
import { Category, ColorKey, Pattern } from '../features/outfits/types';

export interface ItemSuggestion {
  name: string;
  category: Category;
  color: ColorKey;
  formality: 1 | 2 | 3 | 4;
  warmth: 1 | 2 | 3 | 4 | 5;
  pattern: Pattern;
}

/**
 * Sends the photo to the analyze-item edge function (Gemini vision) and
 * returns tag suggestions, or null on any failure — the caller must treat
 * auto-tagging as optional.
 */
export async function analyzeItemPhoto(
  base64: string,
  mimeType: string
): Promise<ItemSuggestion | null> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-item', {
      body: { imageBase64: base64, mimeType },
    });
    if (error || !data || data.error) {
      if (error) console.warn('Auto-tagging failed:', error.message);
      return null;
    }
    return data as ItemSuggestion;
  } catch {
    return null;
  }
}
