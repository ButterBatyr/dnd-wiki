import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Img, removeImage, uploadImage } from '../lib/images';
import { compressImage, orderedCategories, parseTags } from '../lib/util';
import type { Category, Entry } from '../lib/types';
import MarkdownView from '../components/MarkdownView';

export default function EntryEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const requestId = params.get('request');

  const [cats, setCats] = useState<Category[]>([]);
  const [title, setTitle] = useState(params.get('title') ?? '');
  const [body, setBody] = useState('');
  const [secret, setSecret] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [released, setReleased] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [oldImage, setOldImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => setCats((data as Category[]) ?? []));
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('entries').select('*').eq('id', id).maybeSingle();
      if (!data) { setError('Запись не найдена'); setLoading(false); return; }
      const e = data as Entry;
      setTitle(e.title); setBody(e.body); setCategoryId(e.category_id ?? '');
      setTags(e.tags.join(', ')); setReleased(e.status === 'released');
      setImagePath(e.image_path); setOldImage(e.image_path);
      const s = await supabase.from('entry_secrets').select('body').eq('entry_id', id).maybeSingle();
      setSecret((s.data as { body: string } | null)?.body ?? '');
      setLoading(false);
    })();
  }, [id]);

  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const options = useMemo(() => orderedCategories(cats), [cats]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    let uploaded: string | null = null;
    try {
      let path = imagePath;
      if (file) {
        const { blob, ext } = await compressImage(file);
        uploaded = await uploadImage(blob, ext);
        path = uploaded;
      }
      const row = {
        title: title.trim(),
        body,
        image_path: path,
        category_id: categoryId || null,
        tags: parseTags(tags),
        status: released ? 'released' : 'unreleased',
      };
      let entryId = id;
      if (id) {
        const { error: err } = await supabase.from('entries').update(row).eq('id', id);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.from('entries').insert(row).select('id').single();
        if (err) throw err;
        entryId = (data as { id: string }).id;
      }
      if (secret.trim()) {
        const { error: err } = await supabase.from('entry_secrets').upsert({ entry_id: entryId, body: secret });
        if (err) throw err;
      } else {
        await supabase.from('entry_secrets').delete().eq('entry_id', entryId!);
      }
      if (requestId) {
        const { error: err } = await supabase.from('requests').update({ status: 'approved', entry_id: entryId }).eq('id', requestId);
        if (err) throw err;
      }
      if (oldImage && oldImage !== path) await removeImage(oldImage);
      nav(`/e/${entryId}`);
    } catch (err) {
      if (uploaded) await removeImage(uploaded);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-dust">Загружаем…</p>;

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-3xl">{id ? 'Редактирование записи' : 'Новая запись'}</h1>
      {requestId && <p className="panel text-vellum">Запись создаётся по заявке игрока. После сохранения заявка станет «одобрена» и привяжется к записи.</p>}

      <div>
        <label className="label" htmlFor="t">Название</label>
        <input id="t" className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c">Раздел</label>
          <select id="c" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— без раздела —</option>
            {options.map(({ cat, depth }) => <option key={cat.id} value={cat.id}>{'– '.repeat(depth) + cat.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="g">Теги (через запятую)</label>
          <input id="g" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="лаборатория, документ" />
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="label mb-0" htmlFor="b">Описание (Markdown)</label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(!preview)}>
            {preview ? 'Править' : 'Предпросмотр'}
          </button>
        </div>
        {preview ? (
          <div className="panel min-h-[12rem]"><MarkdownView text={body} /></div>
        ) : (
          <textarea id="b" className="input min-h-[12rem] font-body" value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={'Текст записи. Поддерживается **жирный**, *курсив*, # заголовки, - списки, > цитаты.'} />
        )}
      </div>

      <div>
        <label className="label" htmlFor="s">Секрет мастера (виден только вам, игроки не получат этот текст из базы)</label>
        <textarea id="s" className="input min-h-[6rem] border-blood/50" value={secret} onChange={(e) => setSecret(e.target.value)} />
      </div>

      <div>
        <span className="label">Картинка</span>
        <div className="flex flex-wrap items-start gap-4">
          {filePreview ? (
            <img src={filePreview} alt="Новая картинка" className="h-32 rounded-sm border border-gold/30 object-cover" />
          ) : imagePath ? (
            <Img path={imagePath} alt="Текущая картинка" className="h-32 rounded-sm border border-gold/30 object-cover" />
          ) : null}
          <div className="space-y-2">
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block text-sm text-vellum" />
            {(imagePath || file) && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => { setFile(null); setImagePath(null); }}>Убрать картинку</button>
            )}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[#c9a24b]" checked={released} onChange={(e) => setReleased(e.target.checked)} />
        <span>Открыть игрокам (released)</span>
      </label>

      {error && <p role="alert" className="text-blood-light">{error}</p>}
      <div className="flex gap-3">
        <button className="btn btn-gold" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button>
        <Link to={id ? `/e/${id}` : '/admin'} className="btn btn-ghost no-underline">Отмена</Link>
      </div>
    </form>
  );
}
