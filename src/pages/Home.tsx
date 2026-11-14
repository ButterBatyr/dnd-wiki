import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Category, Entry } from '../lib/types';
import { descendantIds } from '../lib/util';
import EntryCard from '../components/EntryCard';

export default function Home() {
  const nav = useNavigate();
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

  const top = cats.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position);
  const total = (id: string) => descendantIds(cats, id).reduce((s, i) => s + (counts[i] ?? 0), 0);
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name;

  function search(e: FormEvent) {
    e.preventDefault();
    nav(`/browse?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="space-y-10">
      <form onSubmit={search} className="flex gap-2">
        <input className="input" type="search" placeholder="Найти предмет, героя, событие…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск" />
        <button className="btn btn-gold">Искать</button>
      </form>

      <section>
        <h2 className="mb-3 text-2xl">Разделы</h2>
        {!loading && top.length === 0 && <p className="text-dust">Разделов пока нет.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {top.map((c) => (
            <Link key={c.id} to={`/browse?cat=${c.id}`} className="frame block p-4 text-parchment no-underline hover:border-gold">
              <span className="block font-display text-lg leading-snug text-gold-light">{c.name}</span>
              <span className="text-sm text-dust">{total(c.id)} зап.</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl">Новые записи</h2>
        {!loading && latest.length === 0 && <p className="text-dust">Мастер ещё ничего не открыл. Загляните позже.</p>}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {latest.map((e) => (
            <EntryCard key={e.id} entry={e} categoryName={catName(e.category_id)} />
          ))}
        </div>
      </section>
    </div>
  );
}
