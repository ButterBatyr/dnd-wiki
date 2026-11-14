import { Link } from 'react-router-dom';
import type { Category } from '../lib/types';
import { catColor, tint } from '../lib/util';

// Раздел в виде ленты: цветной корешок с иконкой + полотно с ласточкиным хвостом
export default function CategoryRibbon({ cat, count }: { cat: Category; count: number }) {
  const col = catColor(cat);
  return (
    <Link to={`/browse?cat=${cat.id}`} className="ribbon flex items-stretch text-parchment no-underline" aria-label={`${cat.name}, записей: ${count}`}>
      <span className="flex w-14 shrink-0 items-center justify-center rounded-l-sm text-2xl text-ink" style={{ background: col }} aria-hidden>
        {cat.icon || '❖'}
      </span>
      <span
        className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pl-4 pr-8"
        style={{
          background: `color-mix(in srgb, ${col} 16%, rgb(var(--c-coal)))`,
          clipPath: 'polygon(0 0, 100% 0, calc(100% - 16px) 50%, 100% 100%, 0 100%)',
          borderTop: `1px solid ${tint(col, 50)}`,
          borderBottom: `1px solid ${tint(col, 50)}`,
        }}
      >
        <span className="min-w-0">
          <span className="block truncate font-display text-lg leading-tight text-gold-light">{cat.name}</span>
          {cat.description && <span className="block truncate text-sm text-vellum">{cat.description}</span>}
        </span>
        <span className="shrink-0 font-display text-sm text-dust">{count}</span>
      </span>
    </Link>
  );
}
