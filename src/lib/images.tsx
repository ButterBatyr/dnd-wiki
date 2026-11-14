import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const BUCKET = 'entry-images';
const cache = new Map<string, { url: string; exp: number }>();

export async function signedUrl(path: string): Promise<string | null> {
  const hit = cache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data) return null;
  cache.set(path, { url: data.signedUrl, exp: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

export async function uploadImage(blob: Blob, ext: string): Promise<string> {
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/webp',
    cacheControl: '31536000',
  });
  if (error) throw new Error('Не удалось загрузить картинку: ' + error.message);
  return path;
}

export async function removeImage(path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}

export function Img({ path, alt, className = '' }: { path: string | null; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!path) {
      setUrl(null);
      return;
    }
    signedUrl(path).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [path]);
  if (!path) return null;
  if (!url) return <div className={`animate-pulse bg-bark ${className}`} aria-hidden />;
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}
