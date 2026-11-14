import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function FavoriteButton({ entryId }: { entryId: string }) {
  const [fav, setFav] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setReady(false);
    supabase.from('favorites').select('entry_id').eq('entry_id', entryId).maybeSingle().then(({ data }) => {
      if (!live) return;
      setFav(Boolean(data));
      setReady(true);
    });
    return () => { live = false; };
  }, [entryId]);

  async function toggle() {
    setBusy(true);
    const { error } = fav
      ? await supabase.from('favorites').delete().eq('entry_id', entryId)
      : await supabase.from('favorites').insert({ entry_id: entryId });
    setBusy(false);
    if (!error) setFav(!fav);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready || busy}
      aria-pressed={fav}
      className={`btn btn-sm ${fav ? 'btn-gold' : 'btn-ghost'}`}
    >
      {fav ? '★ В избранном' : '☆ В избранное'}
    </button>
  );
}
