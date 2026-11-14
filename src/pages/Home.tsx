import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSettings } from '../lib/settings';
import type { Category, Entry } from '../lib/types';
import { descendantIds, orderedCategories } from '../lib/util';
import EntryCard from '../components/EntryCard';
import CategoryRibbon from '../components/CategoryRibbon';

export default function Home() {
  const nav = useNavigate();
  const { settings: s } = useSettings();
  const [cats, setCats] = useState<Category[]>([]);
  const [latest, setLatest] = useState<Entry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, l, n] = await Promise.all([
        supabase.from('categories').select('*').order('position'),
        supabase.from('entries').select('*').eq('status', 'released').order('released_at', { ascending: false }).limit(6),
        supabase.from('entries').select('category_id').eq('status', 'released'),
      ]);
      setCats((c.data as Category[]) ?? []);
      setLatest((l.data as Entry[]) ?? []);
      const map: Record<string, number> = {};
      (n.data ?? []).forEach((r: { category_id: string | null }) => {
        if (r.category_id) map[r.category_id] = (map[r.category_id] ?? 0) + 1;
      });
      setCounts(map);
      setLoading(false);
    })();
  }, []);

  const top = orderedCategories(cats).filter((x) => x.depth === 0).map((x) => x.cat);
  const total = (id: string) => descendantIds(cats, id).reduce((sum, i) => sum + (counts[i] ?? 0), 0);

  function search(e: FormEvent) {
    e.preventDefault();
    nav(`/browse?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="space-y-9">
      <form onSubmit={search} className="flex gap-2">
        <input className="input" type="search" placeholder={s.tagline} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск" />
        <button className="btn btn-gold">Искать</button>
      </form>

      <section>
        <h2 className="mb-3 text-2xl">{s.sectionsTitle}</h2>
        {!loading && top.length === 0 && <p className="text-dust">Разделов пока нет.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {top.map((c) => <CategoryRibbon key={c.id} cat={c} count={total(c.id)} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl">{s.latestTitle}</h2>
        {!loading && latest.length === 0 && <p className="text-dust">Мастер ещё ничего не открыл. Загляните позже.</p>}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {latest.map((e) => <EntryCard key={e.id} entry={e} category={cats.find((c) => c.id === e.category_id)} />)}
        </div>
      </section>
    </div>
  );
}
