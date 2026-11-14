import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { Entry } from '../lib/types';

// Игрок предлагает исправить или дополнить открытую запись; мастер одобряет — правка применяется сразу
export default function SuggestEdit({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (title.trim() === entry.title && body === entry.body && !comment.trim()) {
      setError('Измените текст или опишите, что нужно исправить.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: err } = await supabase.from('requests').insert({
      kind: 'edit',
      entry_id: entry.id,
      title: `Правка: ${entry.title}`.slice(0, 200),
      comment: comment.trim() || null,
      proposed_title: title.trim(),
      proposed_body: body,
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setSent(true);
    setOpen(false);
  }

  if (sent) return <p className="panel text-vellum">Правка отправлена мастеру. Статус можно посмотреть на странице заявок.</p>;
  if (!open) return <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Предложить правку</button>;

  return (
    <form onSubmit={send} className="panel space-y-3">
      <h2 className="text-lg">Предложить правку</h2>
      <p className="text-sm text-vellum">Исправьте название или текст ниже и коротко напишите, что не так. Если мастер одобрит, запись изменится сразу.</p>
      <div>
        <label className="label" htmlFor="et">Название</label>
        <input id="et" className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="eb">Описание (как должно быть)</label>
        <textarea id="eb" className="input min-h-[10rem]" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="ec">Что исправлено и почему</label>
        <textarea id="ec" className="input min-h-[4rem]" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-blood-light">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-gold" disabled={busy}>Отправить мастеру</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Отмена</button>
      </div>
    </form>
  );
}
