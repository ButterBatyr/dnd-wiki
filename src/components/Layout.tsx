import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { SITE_NAME } from '../lib/supabase';

const link = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap border-b-2 px-1 py-2 font-display text-base no-underline ${
    isActive ? 'border-gold text-gold-light' : 'border-transparent text-vellum hover:text-gold-light'
  }`;

export default function Layout({ children }: { children: ReactNode }) {
  const { isDm, profile, signOut } = useAuth();
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4">
      <header className="pt-4">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="font-display text-2xl text-gold-light no-underline sm:text-3xl">
            {SITE_NAME}
          </Link>
          <div className="flex items-center gap-3 text-sm text-dust">
            <span className="hidden sm:inline">
              {profile?.display_name || profile?.email}
              {isDm && ' (DM)'}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>Выйти</button>
          </div>
        </div>
        <nav className="mt-2 flex gap-5 overflow-x-auto border-b border-gold/25" aria-label="Основная навигация">
          <NavLink to="/" end className={link}>Главная</NavLink>
          <NavLink to="/browse" className={link}>Все записи</NavLink>
          <NavLink to="/inventory" className={link}>Мой инвентарь</NavLink>
          {isDm && <NavLink to="/admin" className={link}>Админка</NavLink>}
        </nav>
      </header>
      <main className="flex-1 py-6">{children}</main>
      <footer className="border-t border-gold/20 py-4 text-center text-sm text-dust">
        {SITE_NAME}
      </footer>
    </div>
  );
}
