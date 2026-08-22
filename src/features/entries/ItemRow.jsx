// ============================================================
// Fila de un item ya registrado: descripción + puntos. Usado en
// DailyEntry ("ya registraste hoy") y en DayDetail (historial).
// `onEliminar` es opcional — solo DailyEntry lo pasa (permite
// corregir un registro por accidente); DayDetail es de solo
// lectura y no lo pasa, así que ahí no aparece la caneca.
// ============================================================

export default function ItemRow({ descripcion, puntos, onEliminar }) {
  return (
    <div className="card" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 14, flex: 1 }}>{descripcion}</span>
      <span style={{ fontWeight: 700, color: puntos > 0 ? 'var(--accent)' : 'var(--danger)' }}>
        {puntos > 0 ? `+${puntos}` : puntos}
      </span>
      {onEliminar && (
        <button
          className="btn"
          onClick={onEliminar}
          aria-label="Eliminar"
          style={{ padding: '6px 8px', fontSize: 14, background: 'transparent', border: 'none' }}
        >
          🗑️
        </button>
      )}
    </div>
  );
}
