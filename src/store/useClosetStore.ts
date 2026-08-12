import { create } from 'zustand';
import { ClothingItem, OutfitLogEntry, ScoredOutfit } from '../features/outfits/types';
import { WeatherId } from '../features/outfits/constants';
import { generateCandidates } from '../features/outfits/candidates';
import {
  DEFAULT_MODEL,
  FeedbackAction,
  ItemStats,
  LearnedModel,
  bumpItemStats,
  deriveItemStats,
  sgdUpdate,
  tasteForItem,
  validateModel,
} from '../features/outfits/learning';
import { outfitKey, pickOutfit, SOFTMAX_TEMPERATURE } from '../features/outfits/selection';
import { supabase } from '../lib/supabase';
import { deleteItemPhoto } from '../lib/photos';

function rowToItem(row: any): ClothingItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    color: row.color,
    formality: row.formality,
    warmth: row.warmth,
    pattern: row.pattern,
    lastWornDate: row.last_worn_date,
    photoUri: row.photo_url,
  };
}

function rowToLogEntry(row: any): OutfitLogEntry {
  return {
    id: row.id,
    itemIds: row.item_ids,
    occasion: row.occasion,
    wornAt: row.worn_at,
  };
}

/** Persists a feedback event + the latest learned weights. Fire-and-forget:
 * in-memory learning already happened, and the weights upsert is the full
 * aggregate, so any later successful write recovers a missed one. */
async function persistFeedback(
  outfit: ScoredOutfit,
  occasion: string,
  weather: WeatherId,
  action: FeedbackAction,
  model: LearnedModel
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error: fbError } = await supabase.from('outfit_feedback').insert({
    user_id: user.id,
    item_ids: outfit.items.map((i) => i.id),
    occasion,
    weather,
    action,
    features: {
      colorHarmony: outfit.colorHarmony,
      formalityCoherence: outfit.formalityCoherence,
      novelty: outfit.novelty,
      neglectBonus: outfit.neglectBonus,
      taste: outfit.taste,
    },
  });
  if (fbError) console.warn('Failed to log feedback:', fbError.message);

  const { error: modelError } = await supabase.from('user_model').upsert({
    user_id: user.id,
    weights: model,
    updated_at: new Date().toISOString(),
  });
  if (modelError) console.warn('Failed to save learned weights:', modelError.message);
}

interface ClosetState {
  items: ClothingItem[];
  history: OutfitLogEntry[];
  loading: boolean;
  occasion: string;
  weather: WeatherId;
  anchorId: string | null;

  model: LearnedModel;
  itemStats: Map<string, ItemStats>;
  pool: ScoredOutfit[];
  currentOutfit: ScoredOutfit | null;
  /** Outfit keys shuffled/disliked away this session (not persisted). */
  skippedKeys: string[];

  load: () => Promise<void>;
  refreshPool: () => void;
  setOccasion: (id: string) => void;
  setWeather: (id: WeatherId) => void;
  setAnchor: (id: string | null) => void;
  shuffle: () => void;
  rateCurrent: (rating: 'up' | 'down') => void;
  wearCurrent: () => Promise<void>;
  addItem: (item: Omit<ClothingItem, 'id'>) => Promise<void>;
  updateItem: (id: string, patch: Partial<Omit<ClothingItem, 'id'>>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useClosetStore = create<ClosetState>((set, get) => {
  /** Learns from the outfit currently on screen: SGD step on the weights,
   * per-item stat bumps, then background persistence. */
  const applyFeedback = (action: FeedbackAction) => {
    const state = get();
    const outfit = state.currentOutfit;
    if (!outfit) return;

    const features = {
      colorHarmony: outfit.colorHarmony,
      formalityCoherence: outfit.formalityCoherence,
      novelty: outfit.novelty,
      neglectBonus: outfit.neglectBonus,
      taste: outfit.taste,
    };
    const model = sgdUpdate(state.model, features, action);
    bumpItemStats(
      state.itemStats,
      outfit.items.map((i) => i.id),
      action
    );
    set({ model });

    persistFeedback(outfit, state.occasion, state.weather, action, model).catch((e) =>
      console.warn('Failed to persist feedback:', e?.message ?? e)
    );
  };

  /** Skips the current outfit and samples a different one from the pool. */
  const skipAndResample = () => {
    const state = get();
    if (!state.currentOutfit || state.pool.length === 0) return;

    const currentKey = outfitKey(state.currentOutfit.items);
    let skipped = [...state.skippedKeys, currentKey];
    // Pool exhausted: start over, only avoiding the outfit on screen.
    if (skipped.length >= state.pool.length) skipped = [currentKey];

    const next = pickOutfit(state.pool, skipped, SOFTMAX_TEMPERATURE, Math.random);
    set({ skippedKeys: skipped, currentOutfit: next });
  };

  return {
    items: [],
    history: [],
    loading: true,
    occasion: 'work',
    weather: 'mild',
    anchorId: null,

    model: DEFAULT_MODEL,
    itemStats: new Map(),
    pool: [],
    currentOutfit: null,
    skippedKeys: [],

    refreshPool: () => {
      const state = get();
      const tasteFn = (items: ClothingItem[]) => {
        if (!items.length) return 0.5;
        const total = items.reduce(
          (acc, i) => acc + tasteForItem(state.itemStats.get(i.id), Math.random),
          0
        );
        return total / items.length;
      };

      const pool = generateCandidates(
        state.items,
        state.history,
        state.occasion,
        state.weather,
        state.model.w,
        tasteFn,
        state.anchorId
      );
      const currentOutfit = pickOutfit(pool, [], SOFTMAX_TEMPERATURE, Math.random);
      set({ pool, currentOutfit, skippedKeys: [] });
    },

    load: async () => {
      set({ loading: true });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        set({ items: [], history: [], loading: false });
        return;
      }

      const [itemsRes, historyRes, modelRes, feedbackRes] = await Promise.all([
        supabase.from('items').select('*').order('created_at', { ascending: true }),
        supabase.from('outfit_history').select('*').order('worn_at', { ascending: true }),
        supabase.from('user_model').select('weights').maybeSingle(),
        supabase
          .from('outfit_feedback')
          .select('item_ids, action')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (itemsRes.error) console.warn('Failed to load items:', itemsRes.error.message);
      if (historyRes.error) console.warn('Failed to load outfit history:', historyRes.error.message);
      if (modelRes.error) console.warn('Failed to load learned weights:', modelRes.error.message);
      if (feedbackRes.error) console.warn('Failed to load feedback:', feedbackRes.error.message);

      set({
        items: (itemsRes.data ?? []).map(rowToItem),
        history: (historyRes.data ?? []).map(rowToLogEntry),
        model: validateModel(modelRes.data?.weights),
        itemStats: deriveItemStats(feedbackRes.data ?? []),
        loading: false,
      });
      get().refreshPool();
    },

    setOccasion: (id) => {
      set({ occasion: id, anchorId: null });
      get().refreshPool();
    },
    setWeather: (id) => {
      set({ weather: id, anchorId: null });
      get().refreshPool();
    },
    setAnchor: (id) => {
      set({ anchorId: id });
      get().refreshPool();
    },

    shuffle: () => {
      applyFeedback('shuffle');
      skipAndResample();
    },

    rateCurrent: (rating) => {
      applyFeedback(rating === 'up' ? 'like' : 'dislike');
      // A disliked outfit shouldn't stay on screen; a liked one might still be worn.
      if (rating === 'down') skipAndResample();
    },

    wearCurrent: async () => {
      const state = get();
      const current = state.currentOutfit;
      if (!current) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      const wornIds = current.items.map((i) => i.id);

      const { error: updateError } = await supabase
        .from('items')
        .update({ last_worn_date: now })
        .in('id', wornIds);
      if (updateError) {
        console.warn('Failed to mark items as worn:', updateError.message);
        return;
      }

      const { data: entryRow, error: insertError } = await supabase
        .from('outfit_history')
        .insert({ user_id: user.id, item_ids: wornIds, occasion: state.occasion, worn_at: now })
        .select()
        .single();
      if (insertError || !entryRow) {
        console.warn('Failed to log worn outfit:', insertError?.message);
        return;
      }

      applyFeedback('wear');

      set((s) => ({
        items: s.items.map((i) => (wornIds.includes(i.id) ? { ...i, lastWornDate: now } : i)),
        history: [...s.history, rowToLogEntry(entryRow)],
        anchorId: null,
      }));
      get().refreshPool();
    },

    addItem: async (item) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('items')
        .insert({
          user_id: user.id,
          name: item.name,
          category: item.category,
          color: item.color,
          formality: item.formality,
          warmth: item.warmth,
          pattern: item.pattern,
          last_worn_date: item.lastWornDate,
          photo_url: item.photoUri ?? null,
        })
        .select()
        .single();

      if (error || !data) {
        console.warn('Failed to add item:', error?.message);
        return;
      }

      set((state) => ({ items: [...state.items, rowToItem(data)] }));
      get().refreshPool();
    },

    updateItem: async (id, patch) => {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.category !== undefined) row.category = patch.category;
      if (patch.color !== undefined) row.color = patch.color;
      if (patch.formality !== undefined) row.formality = patch.formality;
      if (patch.warmth !== undefined) row.warmth = patch.warmth;
      if (patch.pattern !== undefined) row.pattern = patch.pattern;
      if (patch.photoUri !== undefined) row.photo_url = patch.photoUri;
      if (patch.lastWornDate !== undefined) row.last_worn_date = patch.lastWornDate;
      if (Object.keys(row).length === 0) return;

      const { data, error } = await supabase
        .from('items')
        .update(row)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        console.warn('Failed to update item:', error?.message);
        return;
      }

      set((state) => ({
        items: state.items.map((i) => (i.id === id ? rowToItem(data) : i)),
      }));
      get().refreshPool();
    },

    deleteItem: async (id) => {
      const item = get().items.find((i) => i.id === id);

      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) {
        console.warn('Failed to delete item:', error.message);
        return;
      }

      if (item?.photoUri) await deleteItemPhoto(item.photoUri);

      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
        anchorId: state.anchorId === id ? null : state.anchorId,
      }));
      get().refreshPool();
    },
  };
});
