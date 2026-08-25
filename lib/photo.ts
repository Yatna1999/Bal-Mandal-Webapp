import { createClient } from '@/lib/supabase/client';

const MAX = 512;

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const tryType = async (type: string, q: number) =>
    new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));

  const blob =
    (await tryType('image/webp', 0.8)) ??
    (await tryType('image/jpeg', 0.82));

  if (!blob) {
    throw new Error('encode failed');
  }

  return blob;
}

export async function uploadBalakPhoto(
  vistarId: string,
  balakId: string,
  file: File
): Promise<string> {
  const blob = await compressImage(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${vistarId}/${balakId}.${ext}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from('balak-photos')
    .upload(path, blob, {
      contentType: blob.type,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}
