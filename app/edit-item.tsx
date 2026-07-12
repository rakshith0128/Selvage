import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useClosetStore } from '../src/store/useClosetStore';
import { ItemForm, ItemFormValues } from '../src/components/ItemForm';
import { uploadItemPhoto, deleteItemPhoto } from '../src/lib/photos';
import { supabase } from '../src/lib/supabase';
import { theme } from '../src/components/theme';
import { ClothingItem } from '../src/features/outfits/types';

export default function EditItemModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useClosetStore((s) => s.items.find((i) => i.id === id));
  const updateItem = useClosetStore((s) => s.updateItem);

  if (!item) {
    return (
      <View style={styles.screen}>
        <Text style={styles.meta}>Item not found.</Text>
      </View>
    );
  }

  const save = async (values: ItemFormValues) => {
    const patch: Partial<Omit<ClothingItem, 'id'>> = {
      name: values.name,
      category: values.category,
      color: values.color,
      formality: values.formality,
      warmth: values.warmth,
      pattern: values.pattern,
    };

    if (values.newPhoto) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const photoUrl = user ? await uploadItemPhoto(user.id, values.newPhoto) : null;
      if (photoUrl) {
        patch.photoUri = photoUrl;
        if (item.photoUri) await deleteItemPhoto(item.photoUri);
      }
    }

    await updateItem(item.id, patch);
    router.back();
  };

  return (
    <ItemForm
      initial={{
        name: item.name,
        category: item.category,
        color: item.color,
        formality: item.formality,
        warmth: item.warmth,
        pattern: item.pattern,
        photoUri: item.photoUri ?? null,
      }}
      submitLabel="Save changes"
      onSubmit={save}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.canvas, padding: 24, alignItems: 'center' },
  meta: { fontSize: 13, color: theme.inkSoft, marginTop: 6 },
});
