import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useClosetStore } from '../../src/store/useClosetStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { CATEGORY_LABEL } from '../../src/features/outfits/constants';
import { Category } from '../../src/features/outfits/types';
import { ItemTag } from '../../src/components/ItemTag';
import { ChipRow } from '../../src/components/ChipRow';
import { theme } from '../../src/components/theme';
import { daysSince } from '../../src/features/outfits/scoring';

const CATEGORIES: ('all' | Category)[] = ['all', 'top', 'bottom', 'shoe', 'outerwear', 'accessory'];

export default function ClosetScreen() {
  const { items } = useClosetStore();
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter);
  const neglectedCount = items.filter((i) => (daysSince(i.lastWornDate) ?? Infinity) > 30).length;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Your closet</Text>
        <View style={styles.headerBtns}>
          <Pressable style={styles.addBtn} onPress={() => router.push('/add-item')}>
            <Text style={styles.addBtnText}>+ Add item</Text>
          </Pressable>
          <Pressable style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutBtnText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.stats}>
        {items.length} items · {neglectedCount} haven't been worn in over a month
      </Text>

      <ChipRow
        items={CATEGORIES.map((c) => ({
          id: c,
          label: c === 'all' ? 'All' : CATEGORY_LABEL[c as Category],
        }))}
        selectedId={filter}
        onSelect={setFilter}
      />

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <ItemTag item={item} onPress={() => router.push(`/item/${item.id}`)} />
        )}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.canvas, padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: theme.ink },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { backgroundColor: theme.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  signOutBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.line,
  },
  signOutBtnText: { color: theme.inkSoft, fontWeight: '600', fontSize: 12 },
  stats: { fontSize: 12, color: theme.inkSoft, marginTop: 4, marginBottom: 12 },
});
