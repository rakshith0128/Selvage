import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClosetStore } from '../../src/store/useClosetStore';
import { COLORS, FORMALITY_LABEL } from '../../src/features/outfits/constants';
import { ItemImage } from '../../src/components/ItemImage';
import { daysSince } from '../../src/features/outfits/scoring';
import { theme } from '../../src/components/theme';

export default function ItemDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useClosetStore((s) => s.items.find((i) => i.id === id));
  const deleteItem = useClosetStore((s) => s.deleteItem);

  if (!item) {
    return (
      <View style={styles.screen}>
        <Text style={styles.meta}>Item not found.</Text>
      </View>
    );
  }

  const d = daysSince(item.lastWornDate);

  const confirmDelete = () => {
    Alert.alert('Delete item?', `"${item.name}" will be removed from your closet.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          router.back();
          await deleteItem(item.id);
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ItemImage item={item} size={160} />
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>
        {COLORS[item.color].label} · {FORMALITY_LABEL[item.formality]} · warmth {item.warmth}/5
      </Text>
      <Text style={styles.meta}>{d === null ? 'Never worn' : `Worn ${d} days ago`}</Text>

      <View style={styles.actions}>
        <Pressable
          style={styles.editBtn}
          onPress={() => router.push({ pathname: '/edit-item', params: { id: item.id } })}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.canvas, padding: 24, alignItems: 'center', paddingTop: 60 },
  name: { fontSize: 18, fontWeight: '600', marginTop: 16, color: theme.ink },
  meta: { fontSize: 13, color: theme.inkSoft, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  editBtn: {
    backgroundColor: theme.accent,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 13.5 },
  deleteBtn: {
    borderWidth: 1,
    borderColor: '#b3452f',
    backgroundColor: theme.card,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  deleteBtnText: { color: '#b3452f', fontWeight: '600', fontSize: 13.5 },
});
