import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Category, EntryLink, LinkedEntry } from '../lib/types';
import EntryBadge from './EntryBadge';

const SELECT =
  '*, from_e:entries!from_entry_id(id, title, badge, category_id, status), to_e:entries!to_entry_id(id, title, badge, category_id, status)';

export default function RelatedEntries({ entryId }: { entryId: string }) {
  const { isDm } = useAuth();
  const [links, setLinks] = useState<EntryLink[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [options, setOptions] = useState<{ id: string; title: string }[]>([]);
  const [target, setTarget] = useState('');
  const [label, setLabel] = useState('');
  const [reverse, setReverse] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('entry_links')
      .select(SELECT)
      .or(`from_entry_id.eq.${entryId},to_entry_id.eq.${entryId}`);
    setLinks((data as unknown as EntryLink[]) ?? []);
  }, [entryId]);

  useEffect(() => {
    load();
    supabase.from('categories').select('*').then(({ data }) => setCats((data as Category[]) ?? []));
  }, [load]);

  useEffect(() => {
    if (!isDm) return;
    supabase.from('entries').select('id, title').neq('id', entryId).order('title').limit(500)
      .then(({ data }) => setOptions((data as { id: string; title: string }[]) ?? []));
  }, [isDm, entryId]);

  // Группируем по подписи связи, глядя со стороны текущей записи
  const groups = useMemo(() => {
    const map = new Map<string, { link: EntryLink; other: LinkedEntry }[]>();
    links.forEach((l) => {
      const mine = l.from_entry_id === entryId;
      const other = mine ? l.to_e : l.from_e;
      if (!other) return;
      const name = (mine ? l.label : l.reverse_label)?.trim() || 'Связано';
      map.set(name, [...(map.get(name) ?? []), { link: l, other }]);
    });
    return Array.from(map.entries());
  }, [links, entryId]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    setError('');
    const { error: err } = await supabase.from('entry_links').insert({
      from_entry_id: entryId,
      to_entry_id: target,
      label: label.trim() || null,
      reverse_label: reverse.trim() || null,
    });
    if (err) {
      setError(err.code === '23505' ? 'Эти записи уже связаны.' : err.message);
      return;
    }
    setTarget(''); setLabel(''); setReverse('');
    load();
  }

  async function remove(id: string) {
    const { error: err } = await supabase.from('entry_links').delete().eq('id', id);
    if (err) setError(err.message);
    load();
  }

  if (groups.length === 0 && !isDm) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl">Связанные записи</h2>
      {groups.length === 0 && <p className="text-dust">Связей пока нет.</p>}
      {groups.map(([name, items]) => (
        <div key={name}>
          <h3 className="mb-1 text-sm text-vellum">{name}</h3>
          <ul className="flex flex-wrap gap-2">
            {items.map(({ link, other }) => (
              <li key={link.id} className="flex items-center gap-1 rounded-sm border border-gold/30 bg-coal px-2 py-1">
                <Link to={`/e/${other.id}`} className="font-display text-parchment no-underline hover:text-gold">{other.title}</Link>
                <EntryBadge label={other.badge} category={cats.find((c) => c.id === other.category_id)} />
                {isDm && other.status === 'unreleased' && <span className="badge border-blood text-blood-light">скрыто</span>}
                {isDm && (
                  <button className="ml-1 text-dust hover:text-blood-light" onClick={() => remove(link.id)} aria-label={`Убрать связь с «${other.title}»`}>✕</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {isDm && (
        <form onSubmit={add} className="panel space-y-3">
          <h3 className="text-base">Связать с другой записью</h3>
          <div>
            <label className="label" htmlFor="lt">Запись</label>
            <select id="lt" className="input" required value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">— выберите —</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ll">Эта запись → та (как подписать)</label>
              <input id="ll" className="input" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Состоит во фракции" />
            </div>
            <div>
              <label className="label" htmlFor="lr">Та запись → эта (как подписать)</label>
              <input id="lr" className="input" maxLength={60} value={reverse} onChange={(e) => setReverse(e.target.value)} placeholder="Участник" />
            </div>
          </div>
          <p className="text-xs text-dust">Подписи необязательны. Игроки увидят связь, только если обе записи открыты.</p>
          {error && <p role="alert" className="text-blood-light">{error}</p>}
          <button className="btn btn-gold btn-sm">Связать</button>
        </form>
      )}
    </section>
  );
}
