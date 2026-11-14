import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Entry, Status } from '../lib/types';

export default function AdminEntries() {
  const [filter, setFilter] = useState<Status | 'all'>('unreleased');
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    let q = supabase.from('entries').select('*').order('updated_at', { ascending: false }).limit(300);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error: err } = await q;
    if (err) setError(err.message);
    setItems((data as Entry[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function toggle(e: Entry) {
    const { error: err } = await supabase.from('entries').update({ status: e.status === 'released' ? 'unreleased' : 'released' }).eq('id', e.id);
    if (err) setError(err.message);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['unreleased', 'released', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`badge text-sm ${filter === f ? 'border-gold bg-gold text-ink' : 'border-gold/40 text-vellum'}`}>
            {f === 'unreleased' ? 'скрытые' : f === 'released' ? 'открытые' : 'все'}
          </button>
        ))}
        <Link to="/entry/new" className="btn btn-gold btn-sm ml-auto no-underline">Новая запись</Link>
      </div>
      {error && <p role="alert" className="text-blood-light">{error}</p>}
      {!loading && items.length === 0 && <p className="text-dust">Записей нет.</p>}
      <ul className="divide-y divide-gold/15 rounded-sm border border-gold/25">
        {items.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-2 p-3">
            <Link to={`/e/${e.id}`} className="font-display text-lg text-parchment">{e.title}</Link>
            <span className={`badge ${e.status === 'released' ? 'border-gold text-gold-light' : 'border-blood text-blood-light'}`}>
              {e.status === 'released' ? 'открыто' : 'скрыто'}
            </span>
            <span className="ml-auto flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => toggle(e)}>{e.status === 'released' ? 'Скрыть' : 'Открыть'}</button>
              <Link to={`/entry/${e.id}/edit`} className="btn btn-ghost btn-sm no-underline">Править</Link>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
