import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useClosetStore } from '../../src/store/useClosetStore';
import { OCCASIONS } from '../../src/features/outfits/constants';
import { ClothingItem } from '../../src/features/outfits/types';
import { ItemTag } from '../../src/components/ItemTag';
import { theme } from '../../src/components/theme';

export default function OutfitsScreen() {
  const { history, items } = useClosetStore();
  const sorted = [...history].reverse();

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Worn log</Text>
      {!sorted.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No outfits logged yet. Wear something from Today to start your log.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(h) => h.id}
          renderItem={({ item: entry }) => {
            const its = entry.itemIds
              .map((id) => items.find((i) => i.id === id))
              .filter((i): i is ClothingItem => Boolean(i));
            const occLabel = OCCASIONS.find((o) => o.id === entry.occasion)?.label ?? entry.occasion;
            return (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.date}>
                  {new Date(entry.wornAt).toLocaleDateString()} · {occLabel}
                </Text>
                {its.map((i) => (
                  <ItemTag key={i.id} item={i} />
                ))}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.canvas, padding: 20, paddingTop: 60 },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.inkFaint,
    marginBottom: 12,
  },
  empty: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
  },
  emptyText: { fontSize: 13, color: theme.inkSoft },
  date: { fontSize: 11.5, color: theme.inkFaint, marginBottom: 6 },
});
