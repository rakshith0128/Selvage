import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ClothingItem } from '../features/outfits/types';
import { COLORS, FORMALITY_LABEL } from '../features/outfits/constants';
import { daysSince } from '../features/outfits/scoring';
import { ItemImage } from './ItemImage';
import { theme } from './theme';

function daysLabel(item: ClothingItem) {
  const d = daysSince(item.lastWornDate);
  if (d === null) return 'Never worn';
  if (d === 0) return 'Worn today';
  return `${d}d since worn`;
}

interface Props {
  item: ClothingItem;
  onPress?: () => void;
}

export function ItemTag({ item, onPress }: Props) {
  const d = daysSince(item.lastWornDate);
  const neglected = d === null || d > 30;

  const content = (
    <>
      <View style={styles.hole} />
      <ItemImage item={item} size={40} />
      <View style={styles.body}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {COLORS[item.color].label} · {FORMALITY_LABEL[item.formality]}
        </Text>
        <Text style={neglected ? styles.neglect : styles.meta}>{daysLabel(item)}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.tag} onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.tag}>{content}</View>;
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  hole: {
    position: 'absolute',
    left: 6,
    top: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.canvas,
    borderWidth: 1,
    borderColor: theme.line,
  },
  body: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: theme.ink },
  meta: { fontSize: 11.5, color: theme.inkSoft, marginTop: 2 },
  neglect: {
    fontSize: 10.5,
    color: theme.gold,
    marginTop: 4,
  },
});
