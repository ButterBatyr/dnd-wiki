import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { configured } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Browse from './pages/Browse';
import EntryPage from './pages/EntryPage';
import EntryEditor from './pages/EntryEditor';
import Inventory from './pages/Inventory';
import Admin from './pages/Admin';

function Gate() {
  const { session, profile, loading, signOut } = useAuth();
  if (!configured) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl">Сайт не настроен</h1>
        <p className="mt-2 text-vellum">
          Не заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY. Добавьте их в .env (локально) или в Secrets репозитория
          (для деплоя). Подробности — в README.
        </p>
      </div>
    );
  }
  if (loading) return <p className="p-8 text-center text-dust">Открываем свиток…</p>;
  if (!session) return <Login />;
  if (!profile) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl">Профиль не найден</h1>
        <p className="mt-2 text-vellum">
          Для вашего аккаунта нет профиля. Скорее всего, schema.sql была выполнена уже после регистрации. Удалите
          пользователя в Supabase → Authentication и зарегистрируйтесь заново.
        </p>
        <button className="btn btn-ghost mt-4" onClick={signOut}>Выйти</button>
      </div>
    );
  }
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function DmOnly() {
  const { isDm } = useAuth();
  return isDm ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Gate />}>
        <Route index element={<Home />} />
        <Route path="browse" element={<Browse />} />
        <Route path="e/:id" element={<EntryPage />} />
        <Route path="inventory" element={<Inventory />} />
        <Route element={<DmOnly />}>
          <Route path="entry/new" element={<EntryEditor />} />
          <Route path="entry/:id/edit" element={<EntryEditor />} />
          <Route path="admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
