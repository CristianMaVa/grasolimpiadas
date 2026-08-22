// ============================================================
// Fila de un item ya registrado: descripción + puntos. Usado en
// DailyEntry ("ya registraste hoy") y en DayDetail (historial).
// ============================================================

export default function ItemRow({ descripcion, puntos }) {
  return (
    <div className="card" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 14, flex: 1 }}>{descripcion}</span>
      <span style={{ fontWeight: 700, color: puntos > 0 ? 'var(--accent)' : 'var(--danger)' }}>
        {puntos > 0 ? `+${puntos}` : puntos}
      </span>
    </div>
  );
}
