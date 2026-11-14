import type { Category, Entry } from './types';

export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
export const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export const parseTags = (s: string) =>
  Array.from(new Set(s.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)));

export function orderedCategories(cats: Category[]): { cat: Category; depth: number }[] {
  const byPos = (a: Category, b: Category) => a.position - b.position || a.name.localeCompare(b.name);
  const out: { cat: Category; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    cats
      .filter((c) => c.parent_id === parent)
      .sort(byPos)
      .forEach((c) => {
        out.push({ cat: c, depth });
        walk(c.id, depth + 1);
      });
  };
  walk(null, 0);
  return out;
}

export function descendantIds(cats: Category[], id: string): string[] {
  const ids = [id];
  cats.filter((c) => c.parent_id === id).forEach((c) => ids.push(...descendantIds(cats, c.id)));
  return ids;
}

export const ACCENT = 'rgb(var(--c-gold))';
export const catColor = (c?: Category | null) => c?.color || ACCENT;
export const badgeColor = (c: Category | null | undefined, label: string | null) =>
  c?.statuses?.find((s) => s.label === label)?.color || ACCENT;
export const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// Краткое описание: своё, а если не заполнено — начало основного текста без разметки
export function summaryOf(e: Pick<Entry, 'summary' | 'body'>, max = 150): string {
  if (e.summary.trim()) return e.summary.trim();
  const plain = e.body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? plain.slice(0, max).trimEnd() + '…' : plain;
}

// Сжимаем картинку до max px в WebP: экономит бесплатные 1 ГБ хранилища
export async function compressImage(file: File, max = 2000): Promise<{ blob: Blob; ext: string }> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    throw new Error('Нужна картинка (JPG, PNG, WebP или GIF)');
  }
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.85));
  if (!blob) throw new Error('Не удалось обработать картинку');
  return { blob, ext: 'webp' };
}
