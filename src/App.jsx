import { useState } from 'react';
import { useProfile } from './features/users/useProfile';
import ProfileSelect from './features/users/ProfileSelect';
import ManageUsers from './features/users/ManageUsers';
import Avatar from './features/users/Avatar';
import DailyEntry from './features/entries/DailyEntry';
import History from './features/entries/History';
import Ranking from './features/ranking/Ranking';
import Feed from './features/feed/Feed';
import AdminGate from './features/admin/AdminGate';
import AdminHome from './features/admin/AdminHome';

// ============================================================
// App raíz.
// Vistas: selección de perfil ↔ gestión de participantes ↔
// registro diario / ranking / historial (Fase 2 y 3) ↔ módulo
// administrativo "Gestionar Reto" (tras PIN, ver AdminGate.jsx) ↔
// feed de comportamiento sospechoso (accesible desde la selección de
// perfil vía "Ver más" en FeedPreview, no una pestaña — ver
// ProfileSelect.jsx).
// ============================================================

const TABS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'historial', label: 'Historial' },
];

export default function App() {
  const { profile, ready, selectProfile, clearProfile, updateProfile } = useProfile();
  const [view, setView] = useState('select'); // 'select' | 'manage' | 'admin-gate' | 'admin' | 'feed'
  const [tab, setTab] = useState('hoy'); // 'hoy' | 'ranking' | 'historial'
  const [fechaEditar, setFechaEditar] = useState(null); // fecha a abrir en "Hoy" al venir desde Historial

  // Abre "Hoy" en una fecha específica (retroactivo: agregar/editar
  // penalidades de un día pasado desde el Historial).
  function irAEditarDia(fecha) {
    setFechaEditar(fecha);
    setTab('hoy');
  }

  if (!ready) return null;

  if (profile) {
    return (
      <div>
        <div
          style={{
            position: 'sticky', top: 0, zIndex: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg)', borderBottom: '1px solid var(--border)',
            paddingTop: 24, paddingBottom: 12, marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar user={profile} size={36} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>{profile.nombre}</div>
          </div>
          <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 13 }} onClick={clearProfile}>
            Salir
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, fontSize: 14 }}
              onClick={() => { setTab(t.key); setFechaEditar(null); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'hoy' && <DailyEntry profile={profile} onUpdateProfile={updateProfile} fechaInicial={fechaEditar} />}
        {tab === 'ranking' && <Ranking />}
        {tab === 'historial' && <History profile={profile} onEditarDia={irAEditarDia} />}
      </div>
    );
  }

  // Sin perfil → flujo de selección / gestión
  if (view === 'manage') {
    return <ManageUsers onBack={() => setView('select')} />;
  }
  if (view === 'admin-gate') {
    return <AdminGate onUnlock={() => setView('admin')} onBack={() => setView('select')} />;
  }
  if (view === 'admin') {
    return <AdminHome onBack={() => setView('select')} />;
  }
  if (view === 'feed') {
    return <Feed onBack={() => setView('select')} />;
  }

  return (
    <ProfileSelect
      onSelect={selectProfile}
      onManage={() => setView('manage')}
      onAdmin={() => setView('admin-gate')}
      onVerFeed={() => setView('feed')}
    />
  );
}
