import { useEffect, useState } from 'react';
import { PRESETS, applyTheme, useSettings, type Colors, type Settings } from '../lib/settings';

const COLOR_FIELDS: { key: keyof Colors; label: string; hint: string }[] = [
  { key: 'bg', label: 'Фон сайта', hint: 'самый тёмный (или светлый) цвет за всем' },
  { key: 'surface', label: 'Карточки и панели', hint: 'фон карточек, чата, форм' },
  { key: 'text', label: 'Текст', hint: 'основной цвет букв' },
  { key: 'accent', label: 'Акцент', hint: 'кнопки, рамки, заголовки (по умолчанию золото)' },
  { key: 'danger', label: 'Предупреждения', hint: 'секреты мастера, удаление, «скрыто»' },
];

const TEXT_FIELDS: { key: keyof Settings; label: string; long?: boolean }[] = [
  { key: 'siteName', label: 'Название сайта' },
  { key: 'tagline', label: 'Подсказка в строке поиска на главной' },
  { key: 'sectionsTitle', label: 'Заголовок блока с разделами на главной' },
  { key: 'latestTitle', label: 'Заголовок блока с новыми записями' },
  { key: 'navHome', label: 'Пункт меню: главная' },
  { key: 'navBrowse', label: 'Пункт меню: все записи' },
  { key: 'navRequests', label: 'Пункт меню и заголовок страницы заявок (был «Мой инвентарь»)' },
  { key: 'navChat', label: 'Пункт меню: чат' },
  { key: 'requestsIntro', label: 'Пояснение на странице заявок', long: true },
];

export default function AdminSettings() {
  const { settings, save } = useSettings();
  const [draft, setDraft] = useState<Settings>(settings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Цвета видны сразу, до сохранения. Если уйти без сохранения — вернём сохранённые.
  useEffect(() => {
    applyTheme(draft.colors);
  }, [draft.colors]);
  useEffect(() => () => applyTheme(settings.colors), [settings.colors]);

  const setColor = (k: keyof Colors, v: string) => setDraft({ ...draft, colors: { ...draft.colors, [k]: v } });

  async function onSave() {
    setBusy(true);
    setMsg(null);
    const err = await save(draft);
    setBusy(false);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Сохранено. Игроки увидят изменения сразу.' });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-xl">Тексты и меню</h2>
        {TEXT_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label" htmlFor={f.key}>{f.label}</label>
            {f.long ? (
              <textarea id={f.key} className="input min-h-[5rem]" value={draft[f.key] as string} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
            ) : (
              <input id={f.key} className="input" value={draft[f.key] as string} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
            )}
          </div>
        ))}
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--c-gold))]" checked={draft.chatEnabled} onChange={(e) => setDraft({ ...draft, chatEnabled: e.target.checked })} />
          <span>Показывать чат в меню (открывать и закрывать его для игроков можно на странице чата)</span>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl">Цвета</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft({ ...draft, colors: p.colors })}>
              <span className="inline-flex gap-0.5" aria-hidden>
                {[p.colors.bg, p.colors.surface, p.colors.accent].map((c, i) => (
                  <span key={i} className="inline-block h-4 w-4 rounded-sm border border-white/30" style={{ background: c }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {COLOR_FIELDS.map((f) => (
            <div key={f.key} className="panel flex items-center gap-3">
              <input type="color" aria-label={f.label} value={draft.colors[f.key]} onChange={(e) => setColor(f.key, e.target.value)} className="h-10 w-14 cursor-pointer rounded-sm border border-gold/40 bg-transparent" />
              <div>
                <div className="font-display text-parchment">{f.label}</div>
                <div className="text-xs text-dust">{f.hint}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-dust">Цвет и значок каждого раздела настраиваются во вкладке «Разделы».</p>
      </section>

      {msg && <p role="status" className={msg.ok ? 'text-gold-light' : 'text-blood-light'}>{msg.text}</p>}
      <button className="btn btn-gold" onClick={onSave} disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить настройки'}</button>
    </div>
  );
}
