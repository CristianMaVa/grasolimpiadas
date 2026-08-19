// ============================================================
// Fila de un item ya registrado: descripción + puntos + fotos
// de evidencia (si tiene). Usado en DailyEntry ("ya registraste
// hoy") y en DayDetail (historial).
// ============================================================

export default function ItemRow({ descripcion, puntos, fotos = [] }) {
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14, flex: 1 }}>{descripcion}</span>
        <span style={{ fontWeight: 700, color: puntos > 0 ? 'var(--accent)' : 'var(--danger)' }}>
          {puntos > 0 ? `+${puntos}` : puntos}
        </span>
      </div>

      {fotos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {fotos.map((f) => (
            <a key={f.id} href={f.foto_url} target="_blank" rel="noreferrer">
              <img
                src={f.foto_url}
                alt={descripcion}
                style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
