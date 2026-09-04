// ============================================================
// Fila de un item ya registrado: descripción + puntos. Usado en
// DailyEntry ("ya registraste hoy") y en DayDetail (historial).
// `onEliminar` es opcional — solo DailyEntry lo pasa (permite
// corregir un registro por accidente); DayDetail es de solo
// lectura y no lo pasa, así que ahí no aparece la caneca.
// `subtitulo` (ajuste post-deploy, comodín por actividad — ver
// supabase/20_comodin_por_actividad.sql) es un texto muted opcional
// bajo la descripción, usado para "Comodín aplicado". `extra` es un
// nodo opcional (ej. el botón de aplicar/quitar comodín) que se
// dibuja entre los puntos y la caneca.
// ============================================================

export default function ItemRow({ descripcion, puntos, subtitulo, extra, onEliminar }) {
  const color = puntos > 0 ? 'var(--accent)' : puntos < 0 ? 'var(--danger)' : 'var(--text-muted)';
  return (
    <div className="card" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 14, flex: 1 }}>
        {descripcion}
        {subtitulo && (
          <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>{subtitulo}</span>
        )}
      </span>
      <span style={{ fontWeight: 700, color }}>
        {puntos > 0 ? `+${puntos}` : puntos}
      </span>
      {extra}
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
