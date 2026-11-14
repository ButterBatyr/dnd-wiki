import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

// Личная заметка к записи: её видит только автор
export default function NotesBox({ entryId }: { entryId: string }) {
  const { session } = useAuth();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let live = true;
    supabase.from('entry_notes').select('body').eq('entry_id', entryId).maybeSingle().then(({ data }) => {
      if (!live) return;
      const b = (data as { body: string } | null)?.body ?? '';
      setText(b);
      setSaved(b);
      setOpen(b.length > 0);
    });
    return () => { live = false; };
  }, [entryId]);

  async function save() {
    if (!session) return;
    setBusy(true);
    setMsg('');
    const { error } = text.trim()
      ? await supabase.from('entry_notes').upsert(
          { user_id: session.user.id, entry_id: entryId, body: text, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,entry_id' },
        )
      : await supabase.from('entry_notes').delete().eq('entry_id', entryId);
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setSaved(text.trim() ? text : '');
    if (!text.trim()) setText('');
    setMsg('Заметка сохранена');
  }

  if (!open) {
    return <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>📝 Добавить личную заметку</button>;
  }

  return (
    <section className="panel space-y-2">
      <h2 className="text-lg">📝 Моя заметка</h2>
      <p className="text-sm text-dust">Видите только вы. Ни мастер, ни другие игроки её не читают.</p>
      <label className="sr-only" htmlFor="note">Личная заметка</label>
      <textarea id="note" className="input min-h-[7rem]" maxLength={5000} value={text} onChange={(e) => { setText(e.target.value); setMsg(''); }}
        placeholder="Подозрения, догадки, вопросы к мастеру…" />
      <div className="flex items-center gap-3">
        <button className="btn btn-gold btn-sm" onClick={save} disabled={busy || text === saved}>Сохранить</button>
        {msg && <span role="status" className="text-sm text-vellum">{msg}</span>}
      </div>
    </section>
  );
}
