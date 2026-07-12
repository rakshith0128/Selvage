import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export interface PickedPhoto {
  uri: string;
  base64: string;
  mimeType: string;
}

const BUCKET = 'item-photos';
const PUBLIC_PATH_MARKER = `/object/public/${BUCKET}/`;

// base64 is requested so the same bytes can be uploaded to Storage and sent
// to the vision edge function without expo-file-system.
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  quality: 0.5,
  base64: true,
  exif: false,
};

export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

  const asset = result.canceled ? null : result.assets[0];
  if (!asset?.base64) return null;

  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Uploads a picked photo and returns the public URL to store in items.photo_url. */
export async function uploadItemPhoto(userId: string, photo: PickedPhoto): Promise<string | null> {
  const ext = photo.mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${randomId()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(photo.base64), { contentType: photo.mimeType, upsert: false });

  if (error) {
    console.warn('Photo upload failed:', error.message);
    return null;
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort removal of a stored photo, given the public URL saved on the item. */
export async function deleteItemPhoto(photoUrl: string): Promise<void> {
  const idx = photoUrl.indexOf(PUBLIC_PATH_MARKER);
  if (idx === -1) return;
  const path = decodeURIComponent(photoUrl.slice(idx + PUBLIC_PATH_MARKER.length));

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn('Photo delete failed:', error.message);
}
