import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CroppedImg } from './CropFrame';
import EntryBadge from './EntryBadge';
import Lightbox from './Lightbox';
import { useAuth } from '../lib/auth';
import type { Category, Entry } from '../lib/types';
import { catColor, summaryOf, tint } from '../lib/util';

export default function EntryCard({ entry, category }: { entry: Entry; category?: Category | null }) {
  const { isDm } = useAuth();
  const [open, setOpen] = useState(false);
  const col = catColor(category);

  return (
    <div
      className="card-lift group relative flex overflow-hidden rounded-sm border bg-coal sm:flex-col"
      style={{ borderColor: tint(col, 40), borderTopColor: col, borderTopWidth: 3 }}
    >
      <div className="relative w-2/5 shrink-0 sm:w-full">
        <Link to={`/e/${entry.id}`} tabIndex={-1} aria-hidden>
          <CroppedImg path={entry.image_path} crop={entry.image_crop} alt="" />
        </Link>
        {entry.image_path && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Посмотреть картинку целиком"
            title="Посмотреть целиком"
            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-sm border border-gold/60 bg-ink/75 text-gold-light backdrop-blur-sm hover:bg-ink"
          >
            ⤢
          </button>
        )}
      </div>

      <Link to={`/e/${entry.id}`} className="flex min-w-0 flex-1 flex-col p-3 text-parchment no-underline">
        <h3 className="text-lg leading-snug group-hover:text-gold">{entry.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-dust">
          {category && <span>{category.icon ? `${category.icon} ` : ''}{category.name}</span>}
          <EntryBadge label={entry.badge} category={category} />
          {isDm && entry.status === 'unreleased' && <span className="badge border-blood text-blood-light">скрыто</span>}
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-vellum">{summaryOf(entry)}</p>
        <span className="mt-auto pt-2 text-sm text-gold-light">Далее…</span>
      </Link>

      {open && entry.image_path && <Lightbox path={entry.image_path} alt={entry.title} onClose={() => setOpen(false)} />}
    </div>
  );
}
