import { useState } from 'react';
import RetoDates from './RetoDates';
import PinManager from './PinManager';
import ManageRules from './ManageRules';

// ============================================================
// Menú del módulo "Gestionar Reto" (tras el PIN de admin, ver
// AdminGate.jsx). Antes las fechas, el PIN por perfil y las
// actividades vivían todas juntas en una sola pantalla larga — se
// separaron en tres pantallas propias para que cada gestión se vea
// sola, con este menú como punto de entrada. Navegación interna
// (no vive en App.jsx) — mismo patrón que History.jsx ↔ DayDetail.jsx.
// ============================================================

const SECCIONES = [
  { key: 'fechas', titulo: 'Fechas', descripcion: 'Inicio y fin del reto' },
  { key: 'pin', titulo: 'PIN por perfil', descripcion: 'Activar/desactivar y generar el PIN de cada participante' },
  { key: 'actividades', titulo: 'Actividades', descripcion: 'Crear, activar/desactivar y ajustar puntos' },
];

export default function AdminHome({ onBack }) {
  const [seccion, setSeccion] = useState(null); // 'fechas' | 'pin' | 'actividades' | null

  if (seccion === 'fechas') return <RetoDates onBack={() => setSeccion(null)} />;
  if (seccion === 'pin') return <PinManager onBack={() => setSeccion(null)} />;
  if (seccion === 'actividades') return <ManageRules onBack={() => setSeccion(null)} />;

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={onBack}>
          ← Volver
        </button>
        <h1 style={{ fontSize: 20, margin: 0 }}>Gestionar Reto</h1>
      </div>

      {SECCIONES.map((s) => (
        <button
          key={s.key}
          className="card"
          onClick={() => setSeccion(s.key)}
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 12 }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{s.titulo}</div>
          <div className="muted" style={{ fontSize: 13 }}>{s.descripcion}</div>
        </button>
      ))}
    </div>
  );
}
