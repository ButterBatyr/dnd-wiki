import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';
import { fmtDate } from '../lib/util';
import type { ReqStatus, Request } from '../lib/types';

export const STATUS_LABEL: Record<ReqStatus, string> = { new: 'ждёт решения', approved: 'одобрена', rejected: 'отклонена' };
export const STATUS_STYLE: Record<ReqStatus, string> = {
  new: 'border-gold/50 text-vellum',
  approved: 'border-gold bg-gold/15 text-gold-light',
  rejected: 'border-blood text-blood-light',
};

export default function Inventory() {
  const { session } = useAuth();
  const { settings } = useSettings();
  const [items, setItems] = useState<Request[]>([]);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('requests')
      .select('*, entries(id, title, status)')
      .eq('player_id', session!.user.id)
      .order('created_at', { ascending: false });
    setItems((data as unknown as Request[]) ?? []);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.from('requests').insert({ kind: 'new', title: title.trim(), comment: comment.trim() || null });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setTitle(''); setComment('');
    load();
  }

  async function withdraw(id: string) {
    await supabase.from('requests').delete().eq('id', id);
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section>
        <h1 className="text-3xl">{settings.navRequests}</h1>
        <p className="mt-1 text-vellum">{settings.requestsIntro}</p>
        <form onSubmit={send} className="panel mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="rt">Что у вас есть</label>
            <input id="rt" className="input" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Документ из лаборатории" />
          </div>
          <div>
            <label className="label" htmlFor="rc">Комментарий (по желанию)</label>
            <textarea id="rc" className="input min-h-[4.5rem]" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-blood-light">{error}</p>}
          <button className="btn btn-gold" disabled={busy}>Отправить мастеру</button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-2xl">Мои заявки</h2>
        {items.length === 0 && <p className="text-dust">Вы ещё ничего не отправляли.</p>}
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="panel">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg text-parchment">{r.title}</span>
                <span className={`badge ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                <span className="ml-auto text-sm text-dust">{fmtDate(r.created_at)}</span>
              </div>
              {r.comment && <p className="mt-1 text-vellum">{r.comment}</p>}

              {r.kind === 'edit' ? (
                <>
                  {r.status === 'approved' && r.entries && <p className="mt-2">Правка применена: <Link to={`/e/${r.entries.id}`}>{r.entries.title}</Link></p>}
                  {r.status === 'new' && r.entries && <p className="mt-2 text-dust">Запись: <Link to={`/e/${r.entries.id}`}>{r.entries.title}</Link></p>}
                </>
              ) : (
                <>
                  {r.entries?.status === 'released' && <p className="mt-2">Запись готова: <Link to={`/e/${r.entries.id}`}>{r.entries.title}</Link></p>}
                  {r.status === 'approved' && r.entries?.status !== 'released' && (
                    <p className="mt-2 text-dust">Мастер принял заявку, запись появится, когда он её откроет.</p>
                  )}
                </>
              )}
              {r.status === 'new' && <button className="btn btn-danger btn-sm mt-2" onClick={() => withdraw(r.id)}>Отозвать</button>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
