import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Img, removeImage } from '../lib/images';
import { fmtDate } from '../lib/util';
import type { Category, Entry } from '../lib/types';
import MarkdownView from '../components/MarkdownView';
import EntryBadge from '../components/EntryBadge';
import SuggestEdit from '../components/SuggestEdit';
import FavoriteButton from '../components/FavoriteButton';
import NotesBox from '../components/NotesBox';
import RelatedEntries from '../components/RelatedEntries';
import { catColor } from '../lib/util';

export default function EntryPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { isDm } = useAuth();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [secret, setSecret] = useState('');
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      setState('loading');
      const { data } = await supabase.from('entries').select('*').eq('id', id).maybeSingle();
      if (!live) return;
      if (!data) { setState('missing'); return; }
      const e = data as Entry;
      setEntry(e);
      if (e.category_id) {
        const c = await supabase.from('categories').select('*').eq('id', e.category_id).maybeSingle();
        if (live) setCategory((c.data as Category) ?? null);
      }
      if (isDm) {
        const s = await supabase.from('entry_secrets').select('body').eq('entry_id', e.id).maybeSingle();
        if (live) setSecret((s.data as { body: string } | null)?.body ?? '');
      }
      setState('ok');
    })();
    return () => { live = false; };
  }, [id, isDm]);

  async function toggle() {
    if (!entry) return;
    const next = entry.status === 'released' ? 'unreleased' : 'released';
    const { data, error: err } = await supabase.from('entries').update({ status: next }).eq('id', entry.id).select().single();
    if (err) setError(err.message); else setEntry(data as Entry);
  }

  async function remove() {
    if (!entry || !window.confirm(`Удалить запись «${entry.title}» навсегда?`)) return;
    const { error: err } = await supabase.from('entries').delete().eq('id', entry.id);
    if (err) { setError(err.message); return; }
    if (entry.image_path) await removeImage(entry.image_path);
    nav('/browse');
  }

  if (state === 'loading') return <p className="text-dust">Разворачиваем свиток…</p>;
  if (state === 'missing' || !entry) {
    return (
      <div>
        <h1 className="text-2xl">Запись не найдена</h1>
        <p className="mt-2 text-vellum">Возможно, мастер ещё не открыл её. <Link to="/browse">К списку записей</Link></p>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <nav className="text-sm text-dust">
        <Link to="/browse">Все записи</Link>
        {category && <> / <Link to={`/browse?cat=${category.id}`}>{category.name}</Link></>}
      </nav>

      {isDm && (
        <div className="panel flex flex-wrap items-center gap-2">
          <span className={`badge ${entry.status === 'released' ? 'border-gold text-gold-light' : 'border-blood text-blood-light'}`}>
            {entry.status === 'released' ? 'открыто игрокам' : 'скрыто от игроков'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={toggle}>
            {entry.status === 'released' ? 'Скрыть' : 'Открыть игрокам'}
          </button>
          <Link className="btn btn-ghost btn-sm no-underline" to={`/entry/${entry.id}/edit`}>Редактировать</Link>
          <button className="btn btn-danger btn-sm ml-auto" onClick={remove}>Удалить</button>
          {error && <p className="w-full text-blood-light">{error}</p>}
        </div>
      )}

      <div className="h-1 w-full rounded-sm" style={{ background: catColor(category) }} aria-hidden />
      <h1 className="text-3xl sm:text-4xl">{entry.title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        <EntryBadge label={entry.badge} category={category} />
        <FavoriteButton entryId={entry.id} />
      </div>
      {entry.image_path && (
        <Img path={entry.image_path} alt={entry.title} className="frame max-h-[70vh] w-full object-contain p-1" />
      )}
      <p className="text-sm text-dust">Добавлено {fmtDate(entry.created_at)}</p>
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entry.tags.map((t) => (
            <Link key={t} to={`/browse?tag=${encodeURIComponent(t)}`} className="badge border-gold/40 text-vellum no-underline hover:border-gold">#{t}</Link>
          ))}
        </div>
      )}

      <MarkdownView text={entry.body} />

      <RelatedEntries entryId={entry.id} />

      <NotesBox entryId={entry.id} />

      {!isDm && entry.status === 'released' && <SuggestEdit entry={entry} />}

      {isDm && secret.trim() && (
        <section className="rounded-sm border border-blood/70 bg-blood/10 p-4">
          <h2 className="mb-2 text-lg text-blood-light">Секрет мастера (игроки этого не видят)</h2>
          <MarkdownView text={secret} />
        </section>
      )}
    </article>
  );
}
