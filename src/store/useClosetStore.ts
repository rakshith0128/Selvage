import { create } from 'zustand';
import { ClothingItem, OutfitLogEntry, ScoredOutfit } from '../features/outfits/types';
import { WeatherId } from '../features/outfits/constants';
import { generateCandidates } from '../features/outfits/candidates';
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

interface ClosetState {
  items: ClothingItem[];
  history: OutfitLogEntry[];
  loading: boolean;
  occasion: string;
  weather: WeatherId;
  anchorId: string | null;
  candidateIndex: number;

  load: () => Promise<void>;
  setOccasion: (id: string) => void;
  setWeather: (id: WeatherId) => void;
  setAnchor: (id: string | null) => void;
  shuffle: () => void;
  wearCurrent: () => Promise<void>;
  addItem: (item: Omit<ClothingItem, 'id'>) => Promise<void>;
  updateItem: (id: string, patch: Partial<Omit<ClothingItem, 'id'>>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getCandidates: () => ScoredOutfit[];
}

export const useClosetStore = create<ClosetState>((set, get) => ({
  items: [],
  history: [],
  loading: true,
  occasion: 'work',
  weather: 'mild',
  anchorId: null,
  candidateIndex: 0,

  load: async () => {
    set({ loading: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set({ items: [], history: [], loading: false });
      return;
    }

    const [itemsRes, historyRes] = await Promise.all([
      supabase.from('items').select('*').order('created_at', { ascending: true }),
      supabase.from('outfit_history').select('*').order('worn_at', { ascending: true }),
    ]);

    if (itemsRes.error) console.warn('Failed to load items:', itemsRes.error.message);
    if (historyRes.error) console.warn('Failed to load outfit history:', historyRes.error.message);

    set({
      items: (itemsRes.data ?? []).map(rowToItem),
      history: (historyRes.data ?? []).map(rowToLogEntry),
      loading: false,
    });
  },

  setOccasion: (id) => set({ occasion: id, anchorId: null, candidateIndex: 0 }),
  setWeather: (id) => set({ weather: id, anchorId: null, candidateIndex: 0 }),
  setAnchor: (id) => set({ anchorId: id, candidateIndex: 0 }),

  shuffle: () => {
    const candidates = get().getCandidates();
    if (!candidates.length) return;
    set((state) => ({ candidateIndex: (state.candidateIndex + 1) % candidates.length }));
  },

  wearCurrent: async () => {
    const state = get();
    const candidates = state.getCandidates();
    const current = candidates[state.candidateIndex];
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

    set((s) => ({
      items: s.items.map((i) => (wornIds.includes(i.id) ? { ...i, lastWornDate: now } : i)),
      history: [...s.history, rowToLogEntry(entryRow)],
      anchorId: null,
      candidateIndex: 0,
    }));
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
      candidateIndex: 0,
    }));
  },

  getCandidates: () => {
    const state = get();
    return generateCandidates(state.items, state.history, state.occasion, state.weather, state.anchorId);
  },
}));
