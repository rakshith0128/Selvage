import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useClosetStore } from '../src/store/useClosetStore';
import { COLORS } from '../src/features/outfits/constants';
import { theme } from '../src/components/theme';
import { Category, ColorKey, Pattern } from '../src/features/outfits/types';

const CATEGORIES: Category[] = ['top', 'bottom', 'shoe', 'outerwear', 'accessory'];
const FORMALITY_OPTIONS: { value: 1 | 2 | 3 | 4; label: string }[] = [
  { value: 1, label: 'Casual' },
  { value: 2, label: 'Smart casual' },
  { value: 3, label: 'Business' },
  { value: 4, label: 'Formal' },
];

export default function AddItemModal() {
  const router = useRouter();
  const addItem = useClosetStore((s) => s.addItem);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('top');
  const [color, setColor] = useState<ColorKey>('navy');
  const [formality, setFormality] = useState<1 | 2 | 3 | 4>(1);
  const [pattern, setPattern] = useState<Pattern>('solid');
  const [warmth, setWarmth] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    await addItem({
      name: name.trim(),
      category,
      color,
      formality,
      warmth,
      pattern,
      lastWornDate: null,
    });
    setSaving(false);
    router.back();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
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
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save item'}</Text>
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
  saveBtn: {
    backgroundColor: theme.accent,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
