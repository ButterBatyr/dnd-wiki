import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Category, Entry } from '../lib/types';
import { descendantIds, orderedCategories } from '../lib/util';
import EntryCard from '../components/EntryCard';

export default function Browse() {
  const { isDm } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('cat') ?? '';
  const tag = params.get('tag') ?? '';
  const st = params.get('st') ?? '';
  const [cats, setCats] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState(q);

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p, { replace: true });
  };

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => setCats((data as Category[]) ?? []));
    supabase.from('entries').select('tags').then(({ data }) => {
      const s = new Set<string>();
      (data ?? []).forEach((r: { tags: string[] }) => r.tags.forEach((t) => s.add(t)));
      setAllTags(Array.from(s).sort());
    });
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    let query = supabase.from('entries').select('*').order('created_at', { ascending: false }).limit(200);
    const clean = q.replace(/[%,()*]/g, ' ').trim();
    if (clean) query = query.or(`title.ilike.%${clean}%,body.ilike.%${clean}%`);
    if (cat && cats.length) query = query.in('category_id', descendantIds(cats, cat));
    if (tag) query = query.contains('tags', [tag]);
    if (isDm && st) query = query.eq('status', st);
    query.then(({ data }) => {
      if (!live) return;
      setEntries((data as Entry[]) ?? []);
      setLoading(false);
    });
    return () => { live = false; };
  }, [q, cat, tag, st, cats, isDm]);

  const options = useMemo(() => orderedCategories(cats), [cats]);
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Все записи</h1>
      <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); set('q', text.trim()); }}>
        <input className="input" type="search" placeholder="Поиск по названию и описанию" value={text} onChange={(e) => setText(e.target.value)} aria-label="Поиск" />
        <select className="input" value={cat} onChange={(e) => set('cat', e.target.value)} aria-label="Раздел">
          <option value="">Все разделы</option>
          {options.map(({ cat: c, depth }) => (
            <option key={c.id} value={c.id}>{'– '.repeat(depth) + c.name}</option>
          ))}
        </select>
        <button className="btn btn-gold">Найти</button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {allTags.map((t) => (
          <button key={t} onClick={() => set('tag', tag === t ? '' : t)}
            className={`badge ${tag === t ? 'border-gold bg-gold text-ink' : 'border-gold/40 text-vellum hover:border-gold'}`}>
            #{t}
          </button>
        ))}
        {isDm && (
          <select className="input ml-auto w-auto py-1 text-sm" value={st} onChange={(e) => set('st', e.target.value)} aria-label="Статус">
            <option value="">Любой статус</option>
            <option value="released">Открытые</option>
            <option value="unreleased">Скрытые</option>
          </select>
        )}
      </div>

      {loading ? <p className="text-dust">Ищем…</p> : entries.length === 0 ? (
        <p className="text-dust">Ничего не найдено. Попробуйте другой запрос или уберите фильтры.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {entries.map((e) => <EntryCard key={e.id} entry={e} categoryName={catName(e.category_id)} />)}
        </div>
      )}
    </div>
  );
}
