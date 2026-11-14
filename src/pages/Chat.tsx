import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';
import { Img, removeImage, uploadImage } from '../lib/images';
import { compressImage, fmtTime } from '../lib/util';
import type { Message } from '../lib/types';
import Lightbox from '../components/Lightbox';

export default function Chat() {
  const { session, profile, isDm, refreshProfile } = useAuth();
  const { settings, save } = useSettings();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? '');
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canWrite = isDm || settings.chatOpen;

  useEffect(() => {
    supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }) => {
      setMsgs(((data as Message[]) ?? []).reverse());
    });
    const ch = supabase
      .channel('chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
        const m = p.new as Message;
        setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => {
        const id = (p.old as { id?: string }).id;
        if (id) setMsgs((cur) => cur.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setBusy(true);
    setError('');
    let path: string | null = null;
    try {
      if (file) {
        const { blob, ext } = await compressImage(file, 1600);
        path = await uploadImage(blob, ext, 'chat-images');
      }
      const { data, error: err } = await supabase.from('messages').insert({ body: text.trim(), image_path: path }).select().single();
      if (err) throw err;
      const m = data as Message;
      setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
      setText('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      if (path) await removeImage(path, 'chat-images');
      setError(err instanceof Error ? err.message : 'Не удалось отправить');
    } finally {
      setBusy(false);
    }
  }

  async function del(m: Message) {
    const { error: err } = await supabase.from('messages').delete().eq('id', m.id);
    if (err) { setError(err.message); return; }
    if (m.image_path) await removeImage(m.image_path, 'chat-images');
    setMsgs((cur) => cur.filter((x) => x.id !== m.id));
  }

  const toggleChat = useCallback(async () => {
    const err = await save({ ...settings, chatOpen: !settings.chatOpen });
    if (err) setError(err);
  }, [save, settings]);

  async function clearAll() {
    if (!window.confirm('Удалить все сообщения и картинки чата? Это нельзя отменить.')) return;
    const paths = msgs.map((m) => m.image_path).filter((p): p is string => Boolean(p));
    if (paths.length) await supabase.storage.from('chat-images').remove(paths);
    const { error: err } = await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err) setError(err.message); else setMsgs([]);
  }

  async function saveName() {
    if (!name.trim() || !session) return;
    const { error: err } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', session.user.id);
    if (err) setError(err.message);
    else { await refreshProfile(); setEditName(false); }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-11.5rem)] max-w-2xl flex-col md:h-[calc(100dvh-12rem)]">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl">{settings.navChat}</h1>
        <span className={`badge ${settings.chatOpen ? 'border-gold text-gold-light' : 'border-blood text-blood-light'}`}>
          {settings.chatOpen ? 'открыт' : 'закрыт'}
        </span>
        {isDm && (
          <span className="ml-auto flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={toggleChat}>{settings.chatOpen ? 'Закрыть чат' : 'Открыть чат'}</button>
            <button className="btn btn-danger btn-sm" onClick={clearAll}>Очистить</button>
          </span>
        )}
      </div>

      <div className="mb-2 text-sm text-dust">
        {editName ? (
          <span className="flex gap-2">
            <input className="input py-1" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Ваше имя в чате" />
            <button className="btn btn-gold btn-sm" onClick={saveName}>Сохранить</button>
          </span>
        ) : (
          <>Вы пишете как <b className="text-vellum">{profile?.display_name}</b>{' '}
            <button className="text-gold-light underline" onClick={() => { setName(profile?.display_name ?? ''); setEditName(true); }}>изменить</button></>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-sm border border-gold/25 bg-coal/60 p-3" aria-live="polite">
        {msgs.length === 0 && <p className="text-dust">Сообщений пока нет.</p>}
        {msgs.map((m) => {
          const mine = m.user_id === session?.user.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-sm border px-3 py-2 ${m.is_dm ? 'border-gold bg-gold/15' : mine ? 'border-gold/40 bg-bark' : 'border-gold/20 bg-coal'}`}>
                <div className="flex items-baseline gap-2 text-xs text-dust">
                  <span className={m.is_dm ? 'font-display text-gold-light' : 'font-display text-vellum'}>{m.author_name}{m.is_dm && ' · мастер'}</span>
                  <span>{fmtTime(m.created_at)}</span>
                  {(isDm || mine) && <button className="ml-auto text-dust hover:text-blood-light" onClick={() => del(m)} aria-label="Удалить сообщение">✕</button>}
                </div>
                {m.image_path && (
                  <button type="button" className="mt-1 block" onClick={() => setZoom(m.image_path)} aria-label="Открыть картинку">
                    <Img path={m.image_path} bucket="chat-images" alt="Картинка из чата" className="max-h-60 rounded-sm object-cover" />
                  </button>
                )}
                {m.body && <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {canWrite ? (
        <form onSubmit={send} className="mt-2 space-y-2">
          {file && <p className="text-sm text-vellum">Картинка: {file.name} <button type="button" className="text-gold-light underline" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}>убрать</button></p>}
          {error && <p role="alert" className="text-blood-light">{error}</p>}
          <div className="flex items-end gap-2">
            <label className="btn btn-ghost cursor-pointer px-3" title="Прикрепить картинку" aria-label="Прикрепить картинку">
              📎
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <textarea className="input max-h-32 min-h-[2.75rem] flex-1" rows={1} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение" aria-label="Сообщение" />
            <button className="btn btn-gold" disabled={busy}>{busy ? '…' : 'Отправить'}</button>
          </div>
        </form>
      ) : (
        <p className="mt-2 text-center text-dust">Чат закрыт. Мастер откроет его на время сессии.</p>
      )}

      {zoom && <Lightbox path={zoom} bucket="chat-images" alt="Картинка из чата" onClose={() => setZoom(null)} />}
    </div>
  );
}
