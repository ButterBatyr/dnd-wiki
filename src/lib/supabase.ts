import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configured = Boolean(url && key);
export const SITE_NAME = (import.meta.env.VITE_SITE_NAME as string | undefined) || 'Хроники кампании';

// PKCE: ссылка из письма возвращается с ?code=..., а не с #access_token,
// поэтому не конфликтует с HashRouter.
export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
});
