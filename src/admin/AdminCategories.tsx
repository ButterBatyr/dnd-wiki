import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { orderedCategories } from '../lib/util';
import type { Category } from '../lib/types';

export default function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*');
    setCats((data as Category[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => orderedCategories(cats), [cats]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    const siblings = cats.filter((c) => (c.parent_id ?? '') === parent);
    const position = siblings.reduce((m, c) => Math.max(m, c.position), 0) + 1;
    const { error: err } = await supabase.from('categories').insert({ name: name.trim(), parent_id: parent || null, position });
    if (err) { setError(err.message); return; }
    setName('');
    load();
  }

  async function rename() {
    if (!editing || !editing.name.trim()) return;
    const { error: err } = await supabase.from('categories').update({ name: editing.name.trim() }).eq('id', editing.id);
    if (err) setError(err.message);
    setEditing(null);
    load();
  }

  async function move(c: Category, dir: -1 | 1) {
    const sibs = cats.filter((x) => x.parent_id === c.parent_id).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    const i = sibs.findIndex((x) => x.id === c.id);
    const j = i + dir;
    if (j < 0 || j >= sibs.length) return;
    // перенумеруем всех соседей, чтобы не было одинаковых позиций
    const order = sibs.slice();
    [order[i], order[j]] = [order[j], order[i]];
    const results = await Promise.all(order.map((x, idx) => supabase.from('categories').update({ position: idx + 1 }).eq('id', x.id)));
    const failed = results.find((r) => r.error);
    if (failed?.error) setError(failed.error.message);
    load();
  }

  async function remove(c: Category) {
    if (!window.confirm(`Удалить раздел «${c.name}» вместе с подразделами?`)) return;
    setError('');
    const { error: err } = await supabase.from('categories').delete().eq('id', c.id);
    if (err) {
      setError(err.code === '23503'
        ? `В разделе «${c.name}» (или его подразделах) есть записи. Сначала перенесите их в другой раздел.`
        : err.message);
      return;
    }
    load();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="panel grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input className="input" required placeholder="Название раздела" value={name} onChange={(e) => setName(e.target.value)} aria-label="Название раздела" />
        <select className="input" value={parent} onChange={(e) => setParent(e.target.value)} aria-label="Родительский раздел">
          <option value="">Верхний уровень</option>
          {list.map(({ cat, depth }) => <option key={cat.id} value={cat.id}>{'– '.repeat(depth) + cat.name}</option>)}
        </select>
        <button className="btn btn-gold">Добавить</button>
      </form>
      {error && <p role="alert" className="text-blood-light">{error}</p>}
      <ul className="divide-y divide-gold/15 rounded-sm border border-gold/25">
        {list.map(({ cat, depth }) => (
          <li key={cat.id} className="flex flex-wrap items-center gap-2 p-2" style={{ paddingLeft: 12 + depth * 24 }}>
            {editing?.id === cat.id ? (
              <>
                <input className="input w-auto flex-1" autoFocus value={editing.name} onChange={(e) => setEditing({ id: cat.id, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setEditing(null); }} aria-label="Новое название" />
                <button className="btn btn-gold btn-sm" onClick={rename}>Сохранить</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Отмена</button>
              </>
            ) : (
              <>
                <span className="font-display text-lg text-parchment">{cat.name}</span>
                <span className="ml-auto flex flex-wrap gap-1">
                  <button className="btn btn-ghost btn-sm" onClick={() => move(cat, -1)} aria-label={`Поднять «${cat.name}»`}>↑</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => move(cat, 1)} aria-label={`Опустить «${cat.name}»`}>↓</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ id: cat.id, name: cat.name })}>Переименовать</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(cat)}>Удалить</button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
