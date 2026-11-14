import { Link } from 'react-router-dom';
import { Img } from '../lib/images';
import type { Entry } from '../lib/types';
import { useAuth } from '../lib/auth';

export default function EntryCard({ entry, categoryName }: { entry: Entry; categoryName?: string }) {
  const { isDm } = useAuth();
  return (
    <Link
      to={`/e/${entry.id}`}
      className="group block overflow-hidden rounded-sm border border-gold/25 bg-coal text-parchment no-underline hover:border-gold"
    >
      {entry.image_path ? (
        <Img path={entry.image_path} alt={entry.title} className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-bark text-4xl text-gold/40" aria-hidden>
          ❖
        </div>
      )}
      <div className="p-3">
        <h3 className="text-lg leading-snug group-hover:text-gold">{entry.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-dust">
          {categoryName && <span>{categoryName}</span>}
          {isDm && entry.status === 'unreleased' && (
            <span className="badge border-blood text-blood-light">скрыто</span>
          )}
        </div>
      </div>
    </Link>
  );
}
