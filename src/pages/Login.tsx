import { useState, type FormEvent } from 'react';
import { supabase, SITE_NAME } from '../lib/supabase';

type Mode = 'signin' | 'signup' | 'magic';

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const redirect = window.location.origin + window.location.pathname;
    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        setMsg({ ok: true, text: 'Ссылка для входа отправлена на почту. Откройте её на этом устройстве.' });
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        if (!data.session) setMsg({ ok: true, text: 'Почти готово: подтвердите адрес по письму и войдите.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Что-то пошло не так';
      setMsg({ ok: false, text: m.includes('Invalid login') ? 'Неверная почта или пароль.' : m });
    } finally {
      setBusy(false);
    }
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => { setMode(m); setMsg(null); }}
      className={`flex-1 border-b-2 py-2 font-display ${mode === m ? 'border-gold text-gold-light' : 'border-transparent text-dust'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-center text-4xl">{SITE_NAME}</h1>
      <p className="mt-2 text-center text-vellum">Войдите, чтобы открыть записи кампании.</p>
      <div className="frame mt-6 p-5">
        <div className="mb-4 flex">
          {tab('signin', 'Вход')}
          {tab('signup', 'Регистрация')}
          {tab('magic', 'По ссылке')}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Почта</label>
            <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== 'magic' && (
            <div>
              <label className="label" htmlFor="pw">Пароль</label>
              <input id="pw" type="password" required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <button className="btn btn-gold w-full" disabled={busy}>
            {mode === 'signin' ? 'Войти' : mode === 'signup' ? 'Зарегистрироваться' : 'Отправить ссылку'}
          </button>
          {msg && <p role="status" className={msg.ok ? 'text-gold-light' : 'text-blood-light'}>{msg.text}</p>}
        </form>
      </div>
    </div>
  );
}
