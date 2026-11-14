import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fmtDate } from '../lib/util';
import type { ReqStatus, Request } from '../lib/types';
import { STATUS_LABEL, STATUS_STYLE } from '../pages/Inventory';

function EditRequest({ r, onChanged, onError }: { r: Request; onChanged: () => void; onError: (m: string) => void }) {
  const [title, setTitle] = useState(r.proposed_title ?? r.entries?.title ?? '');
  const [body, setBody] = useState(r.proposed_body ?? r.entries?.body ?? '');
  const entry = r.entries;

  async function apply() {
    if (!entry) return;
    const upd = await supabase.from('entries').update({ title: title.trim() || entry.title, body }).eq('id', entry.id);
    if (upd.error) { onError(upd.error.message); return; }
    const st = await supabase.from('requests').update({ status: 'approved' }).eq('id', r.id);
    if (st.error) onError(st.error.message);
    onChanged();
  }

  if (!entry) return <p className="text-dust">Запись, к которой относилась правка, удалена.</p>;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <span className="label">Сейчас в записи</span>
          <div className="panel max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-vellum">
            <b className="text-parchment">{entry.title}</b>{'\n\n'}{entry.body}
          </div>
        </div>
        <div>
          <span className="label">Предложено игроком (можно подправить перед применением)</span>
          <input className="input mb-2" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Новое название" />
          <textarea className="input min-h-[10rem]" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Новый текст" />
        </div>
      </div>
      {r.status === 'new' && <button className="btn btn-gold btn-sm" onClick={apply}>Применить правку</button>}
    </div>
  );
}

export default function AdminRequests() {
  const [filter, setFilter] = useState<ReqStatus | 'all'>('new');
  const [items, setItems] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    let q = supabase.from('requests').select('*, profiles(email, display_name), entries(id, title, body, status)').order('created_at', { ascending: false });
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
              <span className="badge border-gold/40 text-vellum">{r.kind === 'edit' ? 'правка' : 'новая вещь'}</span>
              <span className={`badge ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
            </div>
            <p className="text-sm text-dust">
              {r.profiles?.display_name || r.profiles?.email} · {fmtDate(r.created_at)}
            </p>
            {r.comment && <p className="text-vellum">{r.comment}</p>}

            {r.kind === 'edit' && <EditRequest r={r} onChanged={load} onError={setError} />}

            <div className="flex flex-wrap gap-2">
              {r.kind === 'new' && (r.entry_id ? (
                <Link className="btn btn-ghost btn-sm no-underline" to={`/e/${r.entry_id}`}>Открыть запись</Link>
              ) : (
                <Link className="btn btn-gold btn-sm no-underline" to={`/entry/new?request=${r.id}&title=${encodeURIComponent(r.title)}`}>Создать запись</Link>
              ))}
              {r.kind === 'edit' && r.entry_id && (
                <Link className="btn btn-ghost btn-sm no-underline" to={`/e/${r.entry_id}`}>Открыть запись</Link>
              )}
              {r.status === 'new' && (
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
