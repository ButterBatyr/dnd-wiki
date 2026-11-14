import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fmtDate } from '../lib/util';
import type { ReqStatus, Request } from '../lib/types';
import { STATUS_LABEL, STATUS_STYLE } from '../pages/Inventory';

export default function AdminRequests() {
  const [filter, setFilter] = useState<ReqStatus | 'all'>('new');
  const [items, setItems] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    let q = supabase.from('requests').select('*, profiles(email, display_name), entries(id, title, status)').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error: err } = await q;
    if (err) setError(err.message);
    setItems((data as unknown as Request[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: ReqStatus) {
    const { error: err } = await supabase.from('requests').update({ status }).eq('id', id);
    if (err) setError(err.message);
    load();
  }

  async function remove(id: string) {
    if (!window.confirm('Удалить заявку?')) return;
    await supabase.from('requests').delete().eq('id', id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['new', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`badge text-sm ${filter === f ? 'border-gold bg-gold text-ink' : 'border-gold/40 text-vellum'}`}>
            {f === 'all' ? 'все' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-blood-light">{error}</p>}
      {!loading && items.length === 0 && <p className="text-dust">Здесь пока пусто.</p>}
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="panel space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-lg text-parchment">{r.title}</span>
              <span className={`badge ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
            </div>
            <p className="text-sm text-dust">
              {r.profiles?.display_name || r.profiles?.email} · {fmtDate(r.created_at)}
            </p>
            {r.comment && <p className="text-vellum">{r.comment}</p>}
            <div className="flex flex-wrap gap-2">
              {r.entry_id ? (
                <Link className="btn btn-ghost btn-sm no-underline" to={`/e/${r.entry_id}`}>Открыть запись</Link>
              ) : (
                <Link className="btn btn-gold btn-sm no-underline" to={`/entry/new?request=${r.id}&title=${encodeURIComponent(r.title)}`}>Создать запись</Link>
              )}
              {r.status !== 'rejected' && !r.entry_id && (
                <button className="btn btn-danger btn-sm" onClick={() => setStatus(r.id, 'rejected')}>Отклонить</button>
              )}
              {r.status === 'rejected' && (
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus(r.id, 'new')}>Вернуть в очередь</button>
              )}
              <button className="btn btn-ghost btn-sm ml-auto" onClick={() => remove(r.id)}>Удалить</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
