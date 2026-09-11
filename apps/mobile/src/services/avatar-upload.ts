import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

const AVATAR_BUCKET = 'avatars';
const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;

export type AvatarUploadResult =
  | { status: 'uploaded'; url: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export async function chooseAndUploadAvatar(): Promise<AvatarUploadResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
  if (!permission.granted) {
    return { status: 'error', message: 'Allow photo access to choose a profile photo.' };
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.82,
    base64: true,
  });

  if (picked.canceled || !picked.assets[0]) return { status: 'cancelled' };

  const asset = picked.assets[0];
  if (asset.fileSize && asset.fileSize > MAX_SOURCE_IMAGE_BYTES) {
    return { status: 'error', message: 'Choose a photo under 12 MB.' };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: 'error', message: 'Please sign in again before changing photo.' };

    const prepared = asset.base64
      ? {
          body: base64ToArrayBuffer(asset.base64),
          contentType: 'image/jpeg',
          extension: 'jpeg',
        }
      : await readBlobFromAsset(asset);
    if (!prepared) {
      return { status: 'error', message: "We couldn't read that photo. Try another image." };
    }

    const path = `${user.id}/${Date.now()}.${prepared.extension}`;

    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, prepared.body, {
      cacheControl: '3600',
      contentType: prepared.contentType,
      upsert: true,
    });

    if (error) {
      return { status: 'error', message: "We couldn't upload your photo. Try again." };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

    return { status: 'uploaded', url: publicUrl };
  } catch {
    return { status: 'error', message: "We couldn't upload your photo. Try again." };
  }
}

function extensionFor(contentType: string, fileName?: string | null) {
  const fileExtension = fileName?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (fileExtension && ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension)) {
    return fileExtension === 'jpg' ? 'jpeg' : fileExtension;
  }

  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  return 'jpeg';
}

async function readBlobFromAsset(asset: ImagePicker.ImagePickerAsset) {
  const response = await fetch(asset.uri);
  if (!response.ok) return null;

  const blob = await response.blob();
  const contentType = asset.mimeType || response.headers.get('content-type') || 'image/jpeg';

  return {
    body: blob,
    contentType,
    extension: extensionFor(contentType, asset.fileName),
  };
}

function base64ToArrayBuffer(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
