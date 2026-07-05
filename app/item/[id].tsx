import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useClosetStore } from '../../src/store/useClosetStore';
import { COLORS, FORMALITY_LABEL } from '../../src/features/outfits/constants';
import { GarmentIcon } from '../../src/components/GarmentIcon';
import { daysSince } from '../../src/features/outfits/scoring';
import { theme } from '../../src/components/theme';

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useClosetStore((s) => s.items.find((i) => i.id === id));

  if (!item) {
    return (
      <View style={styles.screen}>
        <Text style={styles.meta}>Item not found.</Text>
      </View>
    );
  }

  const d = daysSince(item.lastWornDate);

  return (
    <View style={styles.screen}>
      <GarmentIcon category={item.category} color={COLORS[item.color].hex} size={80} />
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>
        {COLORS[item.color].label} · {FORMALITY_LABEL[item.formality]} · warmth {item.warmth}/5
      </Text>
      <Text style={styles.meta}>{d === null ? 'Never worn' : `Worn ${d} days ago`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.canvas, padding: 24, alignItems: 'center', paddingTop: 60 },
  name: { fontSize: 18, fontWeight: '600', marginTop: 16, color: theme.ink },
  meta: { fontSize: 13, color: theme.inkSoft, marginTop: 6 },
});
