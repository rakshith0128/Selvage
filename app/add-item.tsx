import React from 'react';
import { useRouter } from 'expo-router';
import { useClosetStore } from '../src/store/useClosetStore';
import { ItemForm, ItemFormValues } from '../src/components/ItemForm';
import { uploadItemPhoto } from '../src/lib/photos';
import { supabase } from '../src/lib/supabase';

export default function AddItemModal() {
  const router = useRouter();
  const addItem = useClosetStore((s) => s.addItem);

  const save = async (values: ItemFormValues) => {
    let photoUrl: string | null = null;
    if (values.newPhoto) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // Upload failure is non-fatal: the item still saves without a photo.
      if (user) photoUrl = await uploadItemPhoto(user.id, values.newPhoto);
    }

    await addItem({
      name: values.name,
      category: values.category,
      color: values.color,
      formality: values.formality,
      warmth: values.warmth,
      pattern: values.pattern,
      lastWornDate: null,
      photoUri: photoUrl,
    });
    router.back();
  };

  return <ItemForm submitLabel="Save item" autoAnalyzeOnPick onSubmit={save} />;
}
