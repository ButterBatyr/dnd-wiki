import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { SITE_NAME, supabase } from './supabase';

export interface Colors {
  bg: string;
  surface: string;
  text: string;
  accent: string;
  danger: string;
}
export interface Settings {
  siteName: string;
  tagline: string;
  sectionsTitle: string;
  latestTitle: string;
  navHome: string;
  navBrowse: string;
  navRequests: string;
  navChat: string;
  requestsIntro: string;
  chatEnabled: boolean;
  chatOpen: boolean;
  colors: Colors;
}

export const PRESETS: { id: string; name: string; colors: Colors }[] = [
  { id: 'parchment', name: 'Пергамент и золото', colors: { bg: '#130f0b', surface: '#1d1712', text: '#eadfc4', accent: '#c9a24b', danger: '#9b3a24' } },
  { id: 'emerald', name: 'Изумрудный лес', colors: { bg: '#0b1410', surface: '#12201a', text: '#dfeadc', accent: '#5fb38a', danger: '#a8453a' } },
  { id: 'crimson', name: 'Багровый', colors: { bg: '#150c0d', surface: '#211214', text: '#efdcd6', accent: '#d0594a', danger: '#e08a3c' } },
  { id: 'moon', name: 'Лунное серебро', colors: { bg: '#0d1119', surface: '#151b28', text: '#dfe6f2', accent: '#8fb4e8', danger: '#c4566b' } },
  { id: 'daylight', name: 'Светлый пергамент', colors: { bg: '#efe4c8', surface: '#f8f0da', text: '#2a2117', accent: '#8a5a12', danger: '#9b2f1b' } },
];

export const DEFAULTS: Settings = {
  siteName: SITE_NAME,
  tagline: 'Найдите предмет, героя или событие кампании',
  sectionsTitle: 'Разделы',
  latestTitle: 'Новые записи',
  navHome: 'Главная',
  navBrowse: 'Все записи',
  navRequests: 'Мой инвентарь',
  navChat: 'Чат',
  requestsIntro: 'Нашли предмет или документ? Напишите, что у вас есть, и мастер добавит описание в записи. Заметили ошибку в записи? Нажмите «Предложить правку» на её странице.',
  chatEnabled: true,
  chatOpen: false,
  colors: PRESETS[0].colors,
};

const HEX = /^#[0-9a-f]{6}$/i;
type RGB = [number, number, number];
const toRgb = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t)) as RGB;
const css = (c: RGB) => c.join(' ');

export function applyTheme(colors: Colors) {
  const safe = (k: keyof Colors) => (HEX.test(colors[k]) ? colors[k] : PRESETS[0].colors[k]);
  const bg = toRgb(safe('bg'));
  const surface = toRgb(safe('surface'));
  const text = toRgb(safe('text'));
  const accent = toRgb(safe('accent'));
  const danger = toRgb(safe('danger'));
  const vars: Record<string, string> = {
    '--c-ink': css(bg),
    '--c-coal': css(surface),
    '--c-bark': css(mix(surface, text, 0.08)),
    '--c-parchment': css(text),
    '--c-vellum': css(mix(text, bg, 0.22)),
    '--c-dust': css(mix(text, bg, 0.5)),
    '--c-gold': css(accent),
    '--c-gold-light': css(mix(accent, text, 0.35)),
    '--c-gold-dark': css(mix(accent, bg, 0.4)),
    '--c-blood': css(danger),
    '--c-blood-light': css(mix(danger, text, 0.3)),
  };
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', safe('bg'));
}

const CACHE_KEY = 'dnd-wiki-settings';
function merge(d: Partial<Settings> | null | undefined): Settings {
  return { ...DEFAULTS, ...(d ?? {}), colors: { ...DEFAULTS.colors, ...(d?.colors ?? {}) } };
}
function readCache(): Settings {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return merge(JSON.parse(raw));
  } catch { /* ignore */ }
  return DEFAULTS;
}
// Применяем сохранённую тему сразу, чтобы не мигали цвета по умолчанию
export function applyCachedTheme() {
  applyTheme(readCache().colors);
}

interface Ctx {
  settings: Settings;
  save: (s: Settings) => Promise<string | null>;
}
const SettingsCtx = createContext<Ctx>({ settings: DEFAULTS, save: async () => null });
export const useSettings = () => useContext(SettingsCtx);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(readCache);

  const apply = useCallback((data: Partial<Settings> | null) => {
    const s = merge(data);
    setSettings(s);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    applyTheme(settings.colors);
    document.title = settings.siteName;
  }, [settings]);

  useEffect(() => {
    supabase.from('site_settings').select('data').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) apply((data as { data: Partial<Settings> }).data);
    });
    const ch = supabase
      .channel('site-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (p) => {
        const row = p.new as { data?: Partial<Settings> };
        if (row?.data) apply(row.data);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [apply]);

  const save = async (s: Settings) => {
    const { error } = await supabase.from('site_settings').upsert({ id: 1, data: s, updated_at: new Date().toISOString() });
    if (error) return error.message;
    apply(s);
    return null;
  };

  return <SettingsCtx.Provider value={{ settings, save }}>{children}</SettingsCtx.Provider>;
}
