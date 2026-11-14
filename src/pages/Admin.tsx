import { useState } from 'react';
import AdminRequests from '../admin/AdminRequests';
import AdminEntries from '../admin/AdminEntries';
import AdminCategories from '../admin/AdminCategories';
import AdminUsers from '../admin/AdminUsers';
import AdminSettings from '../admin/AdminSettings';

const TABS = [
  { id: 'requests', label: 'Заявки', el: <AdminRequests /> },
  { id: 'entries', label: 'Записи', el: <AdminEntries /> },
  { id: 'categories', label: 'Разделы', el: <AdminCategories /> },
  { id: 'users', label: 'Игроки', el: <AdminUsers /> },
  { id: 'settings', label: 'Настройки', el: <AdminSettings /> },
];

export default function Admin() {
  const [tab, setTab] = useState('requests');
  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Панель мастера</h1>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-gold/25">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 font-display ${tab === t.id ? 'border-gold text-gold-light' : 'border-transparent text-vellum hover:text-gold-light'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{TABS.find((t) => t.id === tab)?.el}</div>
    </div>
  );
}
