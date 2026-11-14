import type { Category } from '../lib/types';
import { badgeColor, tint } from '../lib/util';

export default function EntryBadge({ label, category }: { label: string | null; category?: Category | null }) {
  if (!label) return null;
  const color = badgeColor(category, label);
  return (
    <span className="badge" style={{ borderColor: color, color, background: tint(color, 15) }}>
      {label}
    </span>
  );
}
