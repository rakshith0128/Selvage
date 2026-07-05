import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useClosetStore } from '../../src/store/useClosetStore';
import { OCCASIONS, WeatherId, WEATHERS } from '../../src/features/outfits/constants';
import { explainOutfit, daysSince } from '../../src/features/outfits/scoring';
import { ItemTag } from '../../src/components/ItemTag';
import { ChipRow } from '../../src/components/ChipRow';
import { theme } from '../../src/components/theme';

export default function TodayScreen() {
  const {
    items,
    loading,
    occasion,
    weather,
    candidateIndex,
    setOccasion,
    setWeather,
    shuffle,
    wearCurrent,
    setAnchor,
    getCandidates,
  } = useClosetStore();

  const candidates = getCandidates();
  const current = candidates[candidateIndex];

  if (loading) {
    return (
      <View style={[styles.screen, styles.loadingScreen]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const neglected = [...items]
    .sort((a, b) => {
      const av = daysSince(a.lastWornDate) ?? Infinity;
      const bv = daysSince(b.lastWornDate) ?? Infinity;
      return bv - av;
    })
    .slice(0, 2);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <Text style={styles.title}>Selvage</Text>

      <Text style={styles.label}>Where to</Text>
      <ChipRow items={OCCASIONS} selectedId={occasion} onSelect={setOccasion} />

      <Text style={styles.label}>Weather today</Text>
      <ChipRow items={WEATHERS} selectedId={weather} onSelect={(id) => setWeather(id as WeatherId)} />

      <Text style={styles.label}>Today's pick</Text>
      {!current ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Not enough items for this occasion and weather yet. Try a different combination, or
            add a few more pieces to your closet.
          </Text>
        </View>
      ) : (
        <View>
          {current.items.map((i) => (
            <ItemTag key={i.id} item={i} />
          ))}
          <Text style={styles.why}>Picked because {explainOutfit(current)}.</Text>
          <View style={styles.btnRow}>
            <Pressable style={styles.btnSecondary} onPress={shuffle}>
              <Text style={styles.btnSecondaryText}>Shuffle</Text>
            </Pressable>
            <Pressable style={styles.btnPrimary} onPress={wearCurrent}>
              <Text style={styles.btnPrimaryText}>Wear this today</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Text style={styles.label}>Haven't worn in a while</Text>
      {neglected.map((i) => (
        <View key={i.id} style={{ marginBottom: 8 }}>
          <ItemTag item={i} />
          <Pressable style={styles.btnSecondary} onPress={() => setAnchor(i.id)}>
            <Text style={styles.btnSecondaryText}>Build today's outfit around this</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.canvas },
  loadingScreen: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: theme.ink, marginBottom: 16 },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.inkFaint,
    marginTop: 18,
    marginBottom: 8,
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
  why: { fontSize: 12.5, color: theme.inkSoft, fontStyle: 'italic', marginVertical: 10 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: {
    flex: 1,
    backgroundColor: theme.accent,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 13.5 },
  btnSecondary: {
    flex: 1,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  btnSecondaryText: { color: theme.ink, fontWeight: '600', fontSize: 13.5 },
});
