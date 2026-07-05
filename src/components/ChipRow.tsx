import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { theme } from './theme';

interface ChipItem {
  id: string;
  label: string;
}

interface Props {
  items: ChipItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ChipRow({ items, selectedId, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
      {items.map((it) => {
        const active = it.id === selectedId;
        return (
          <Pressable
            key={it.id}
            onPress={() => onSelect(it.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  label: { fontSize: 13, color: theme.inkSoft, textTransform: 'capitalize' },
  labelActive: { color: '#fff' },
});
