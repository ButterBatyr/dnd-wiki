import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';

export default function Layout({ children }: { children: ReactNode }) {
  const { isDm, profile, signOut } = useAuth();
  const { settings: s } = useSettings();

  const items = [
    { to: '/', end: true, icon: '🏰', label: s.navHome },
    { to: '/browse', end: false, icon: '📖', label: s.navBrowse },
    { to: '/inventory', end: false, icon: '📜', label: s.navRequests },
    ...(s.chatEnabled ? [{ to: '/chat', end: false, icon: '💬', label: s.navChat }] : []),
    ...(isDm ? [{ to: '/admin', end: false, icon: '⚙️', label: 'Админка' }] : []),
  ];

  const top = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap border-b-2 px-1 py-2 font-display text-base no-underline ${
      isActive ? 'border-gold text-gold-light' : 'border-transparent text-vellum hover:text-gold-light'
    }`;
  const bottom = ({ isActive }: { isActive: boolean }) =>
    `flex min-w-0 flex-col items-center gap-0.5 px-1 py-2 text-[11px] leading-tight no-underline ${
      isActive ? 'text-gold-light' : 'text-dust'
    }`;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4">
      <header className="pt-4">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="font-display text-2xl text-gold-light no-underline sm:text-3xl">
            {s.siteName}
          </Link>
          <div className="flex items-center gap-3 text-sm text-dust">
            <span className="hidden sm:inline">
              {profile?.display_name || profile?.email}
              {isDm && ' (DM)'}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>Выйти</button>
          </div>
        </div>
        <nav className="mt-2 hidden gap-6 border-b border-gold/25 md:flex" aria-label="Основная навигация">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={top}>{i.label}</NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 pb-24 pt-5 md:pb-8 md:pt-6">{children}</main>

      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-gold/30 bg-ink/95 backdrop-blur md:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={bottom}>
            <span className="text-xl" aria-hidden>{i.icon}</span>
            <span className="max-w-full truncate">{i.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
