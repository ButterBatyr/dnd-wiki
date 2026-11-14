import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Bucket = 'entry-images' | 'chat-images';
const cache = new Map<string, { url: string; exp: number }>();

export async function signedUrl(path: string, bucket: Bucket = 'entry-images'): Promise<string | null> {
  const key = bucket + '/' + path;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data) return null;
  cache.set(key, { url: data.signedUrl, exp: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

export function useSignedUrl(path: string | null, bucket: Bucket = 'entry-images') {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!path) {
      setUrl(null);
      return;
    }
    signedUrl(path, bucket).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [path, bucket]);
  return url;
}

export async function uploadImage(blob: Blob, ext: string, bucket: Bucket = 'entry-images'): Promise<string> {
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || 'image/webp',
    cacheControl: '31536000',
  });
  if (error) throw new Error('Не удалось загрузить картинку: ' + error.message);
  return path;
}

export async function removeImage(path: string, bucket: Bucket = 'entry-images') {
  await supabase.storage.from(bucket).remove([path]);
}

export function Img({ path, alt, className = '', bucket = 'entry-images' }: { path: string | null; alt: string; className?: string; bucket?: Bucket }) {
  const url = useSignedUrl(path, bucket);
  if (!path) return null;
  if (!url) return <div className={`animate-pulse bg-bark ${className}`} aria-hidden />;
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}
