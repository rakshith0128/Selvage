import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../features/outfits/constants';
import { theme } from './theme';
import { Category, ColorKey, Pattern } from '../features/outfits/types';
import { pickPhoto, PickedPhoto } from '../lib/photos';
import { analyzeItemPhoto } from '../lib/analyzeItem';

const CATEGORIES: Category[] = ['top', 'bottom', 'shoe', 'outerwear', 'accessory'];
const FORMALITY_OPTIONS: { value: 1 | 2 | 3 | 4; label: string }[] = [
  { value: 1, label: 'Casual' },
  { value: 2, label: 'Smart casual' },
  { value: 3, label: 'Business' },
  { value: 4, label: 'Formal' },
];

export interface ItemFormValues {
  name: string;
  category: Category;
  color: ColorKey;
  formality: 1 | 2 | 3 | 4;
  warmth: 1 | 2 | 3 | 4 | 5;
  pattern: Pattern;
  /** Existing remote URL, or local uri of a freshly picked photo. */
  photoUri: string | null;
  /** Set only when the user picked/replaced a photo in this session. */
  newPhoto: PickedPhoto | null;
}

interface Props {
  initial?: Partial<ItemFormValues>;
  submitLabel: string;
  /** When true, a freshly picked photo is sent for AI tag suggestions. */
  autoAnalyzeOnPick?: boolean;
  onSubmit: (values: ItemFormValues) => Promise<void>;
}

export function ItemForm({ initial, submitLabel, autoAnalyzeOnPick, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'top');
  const [color, setColor] = useState<ColorKey>(initial?.color ?? 'navy');
  const [formality, setFormality] = useState<1 | 2 | 3 | 4>(initial?.formality ?? 1);
  const [pattern, setPattern] = useState<Pattern>(initial?.pattern ?? 'solid');
  const [warmth, setWarmth] = useState<1 | 2 | 3 | 4 | 5>(initial?.warmth ?? 3);
  const [photoUri, setPhotoUri] = useState<string | null>(initial?.photoUri ?? null);
  const [newPhoto, setNewPhoto] = useState<PickedPhoto | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeFailed, setAnalyzeFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const onPick = async (source: 'camera' | 'library') => {
    const photo = await pickPhoto(source);
    if (!photo) return;
    setPhotoUri(photo.uri);
    setNewPhoto(photo);
    setAnalyzeFailed(false);

    if (!autoAnalyzeOnPick) return;
    setAnalyzing(true);
    const suggestion = await analyzeItemPhoto(photo.base64, photo.mimeType);
    setAnalyzing(false);
    if (!suggestion) {
      setAnalyzeFailed(true);
      return;
    }
    setName(suggestion.name);
    setCategory(suggestion.category);
    setColor(suggestion.color);
    setFormality(suggestion.formality);
    setWarmth(suggestion.warmth);
    setPattern(suggestion.pattern);
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        category,
        color,
        formality,
        warmth,
        pattern,
        photoUri,
        newPhoto,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={styles.fieldLabel}>Photo</Text>
      <View style={styles.photoRow}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>No photo</Text>
          </View>
        )}
        <View style={styles.photoButtons}>
          <Pressable style={styles.photoBtn} onPress={() => onPick('camera')}>
            <Text style={styles.photoBtnText}>Take photo</Text>
          </Pressable>
          <Pressable style={styles.photoBtn} onPress={() => onPick('library')}>
            <Text style={styles.photoBtnText}>Choose from library</Text>
          </Pressable>
        </View>
      </View>
      {analyzing && (
        <View style={styles.analyzeRow}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={styles.analyzeText}>Analyzing photo…</Text>
        </View>
      )}
      {analyzeFailed && (
        <Text style={styles.analyzeFailedText}>
          Couldn't auto-tag this photo — fill in the details manually.
        </Text>
      )}

      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Grey wool cardigan"
        placeholderTextColor={theme.inkFaint}
      />

      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.row}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.pill, category === c && styles.pillActive]}
          >
            <Text style={[styles.pillText, category === c && styles.pillTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Color</Text>
      <View style={styles.row}>
        {Object.entries(COLORS).map(([key, v]) => (
          <Pressable
            key={key}
            onPress={() => setColor(key as ColorKey)}
            style={[styles.swatch, { backgroundColor: v.hex }, color === key && styles.swatchActive]}
          />
        ))}
      </View>

      <Text style={styles.fieldLabel}>Formality</Text>
      <View style={styles.row}>
        {FORMALITY_OPTIONS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setFormality(f.value)}
            style={[styles.pill, formality === f.value && styles.pillActive]}
          >
            <Text style={[styles.pillText, formality === f.value && styles.pillTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Pattern</Text>
      <View style={styles.row}>
        {(['solid', 'pattern'] as Pattern[]).map((p) => (
          <Pressable key={p} onPress={() => setPattern(p)} style={[styles.pill, pattern === p && styles.pillActive]}>
            <Text style={[styles.pillText, pattern === p && styles.pillTextActive]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Warmth: {warmth}/5</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((w) => (
          <Pressable
            key={w}
            onPress={() => setWarmth(w as 1 | 2 | 3 | 4 | 5)}
            style={[styles.pill, warmth === w && styles.pillActive]}
          >
            <Text style={[styles.pillText, warmth === w && styles.pillTextActive]}>{w}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.canvas },
  fieldLabel: { fontSize: 12, color: theme.inkSoft, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: theme.ink,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
  },
  pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  pillText: { fontSize: 12.5, color: theme.inkSoft, textTransform: 'capitalize' },
  pillTextActive: { color: '#fff' },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: theme.line },
  swatchActive: { borderWidth: 3, borderColor: theme.accentInk },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoPreview: {
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: theme.line,
  },
  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    borderStyle: 'dashed',
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: { fontSize: 11.5, color: theme.inkFaint },
  photoButtons: { flex: 1, gap: 8 },
  photoBtn: {
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  photoBtnText: { fontSize: 12.5, color: theme.ink },
  analyzeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  analyzeText: { fontSize: 12, color: theme.inkSoft },
  analyzeFailedText: { fontSize: 12, color: theme.inkSoft, marginTop: 10, fontStyle: 'italic' },
  saveBtn: {
    backgroundColor: theme.accent,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
