import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { fmtDate } from '../lib/util';
import type { Profile, Role } from '../lib/types';

export default function AdminUsers() {
  const { session } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setUsers((data as Profile[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setRole(u: Profile, role: Role) {
    setError('');
    const { error: err } = await supabase.from('profiles').update({ role }).eq('id', u.id);
    if (err) setError(err.message);
    load();
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-blood-light">{error}</p>}
      <ul className="divide-y divide-gold/15 rounded-sm border border-gold/25">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
            <div>
              <div className="font-display text-lg text-parchment">{u.display_name || u.email}</div>
              <div className="text-sm text-dust">{u.email} · с {fmtDate(u.created_at)}</div>
            </div>
            <select className="input ml-auto w-auto" value={u.role} disabled={u.id === session?.user.id}
              onChange={(e) => setRole(u, e.target.value as Role)} aria-label={`Роль: ${u.email}`}>
              <option value="player">Игрок</option>
              <option value="dm">Мастер (DM)</option>
            </select>
          </li>
        ))}
      </ul>
      <p className="text-sm text-dust">Свою роль изменить нельзя — это защита от потери доступа.</p>
    </div>
  );
}
