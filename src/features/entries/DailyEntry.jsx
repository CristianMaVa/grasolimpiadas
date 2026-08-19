import { useState, useEffect, useCallback, useMemo } from 'react';
import { listCheckableRules } from './rulesApi';
import { getEntryForDate, countComidaLibreEnSemana, saveDailyEntry, ajustarComodines } from './entriesApi';
import { calcularNeto } from './pointsEngine';

// ============================================================
// Registro diario (Fase 2).
// Checklist agrupado por categoría + comodín (retroactivo,
// deja el día en 0) + comida libre (1/semana, sin penalizar) +
// foto opcional de evidencia. Editable para el día actual y
// para días pasados.
// ============================================================

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyEntry({ profile, onUpdateProfile }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [reglas, setReglas] = useState([]);
  const [marcadas, setMarcadas] = useState([]);
  const [comodinUsado, setComodinUsado] = useState(false);
  const [comodinOriginal, setComodinOriginal] = useState(false);
  const [comidaLibreUsada, setComidaLibreUsada] = useState(false);
  const [otrasComidasLibres, setOtrasComidasLibres] = useState(0);
  const [foto, setFoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listCheckableRules();
        if (alive) setReglas(data);
      } catch (e) {
        if (alive) setError('No se pudo cargar el reglamento.');
      }
    })();
    return () => { alive = false; };
  }, []);

  const cargarDia = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGuardado(false);
    try {
      const { entry, reglaKeys } = await getEntryForDate(profile.id, fecha);
      setMarcadas(reglaKeys);
      setComodinUsado(entry?.comodin_usado ?? false);
      setComodinOriginal(entry?.comodin_usado ?? false);
      setComidaLibreUsada(entry?.comida_libre_usada ?? false);
      const otras = await countComidaLibreEnSemana(profile.id, fecha, entry?.id ?? null);
      setOtrasComidasLibres(otras);
    } catch (e) {
      setError('No se pudo cargar el día.');
    } finally {
      setLoading(false);
    }
  }, [profile.id, fecha]);

  useEffect(() => { cargarDia(); }, [cargarDia]);

  function toggleRegla(key) {
    setMarcadas((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const itemsMarcados = useMemo(
    () => reglas.filter((r) => marcadas.includes(r.regla_key)),
    [reglas, marcadas]
  );

  const netoPreview = useMemo(
    () => calcularNeto(itemsMarcados, { comodinUsado, comidaLibreUsada }),
    [itemsMarcados, comodinUsado, comidaLibreUsada]
  );

  const categorias = useMemo(() => {
    const orden = [];
    const grupos = {};
    for (const r of reglas) {
      if (!grupos[r.categoria]) { grupos[r.categoria] = []; orden.push(r.categoria); }
      grupos[r.categoria].push(r);
    }
    return orden.map((categoria) => ({ categoria, items: grupos[categoria] }));
  }, [reglas]);

  const comodinesDisponibles = profile.comodines_restantes ?? 2;
  const puedeActivarComodin = comodinUsado || comodinesDisponibles > 0;
  const puedeActivarComidaLibre = comidaLibreUsada || otrasComidasLibres < 1;

  async function handleGuardar() {
    setSaving(true);
    setError(null);
    try {
      await saveDailyEntry({
        userId: profile.id,
        fecha,
        reglas,
        reglaKeysMarcadas: marcadas,
        comodinUsado,
        comidaLibreUsada,
        foto,
      });

      if (comodinUsado !== comodinOriginal) {
        const delta = comodinUsado ? -1 : 1;
        const userActualizado = await ajustarComodines(profile.id, delta);
        onUpdateProfile({ comodines_restantes: userActualizado.comodines_restantes });
        setComodinOriginal(comodinUsado);
      }

      setFoto(null);
      setGuardado(true);
    } catch (e) {
      setError('No se pudo guardar el día.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          Día
        </label>
        <input
          type="date"
          className="input"
          value={fecha}
          max={hoyISO()}
          onChange={(e) => setFecha(e.target.value)}
        />
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && (
        <>
          <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
            <Toggle
              label={`Comodín (${comodinesDisponibles} disponible${comodinesDisponibles === 1 ? '' : 's'})`}
              activo={comodinUsado}
              disabled={!puedeActivarComodin}
              onClick={() => setComodinUsado((v) => !v)}
            />
            <Toggle
              label="Comida libre"
              activo={comidaLibreUsada}
              disabled={!puedeActivarComidaLibre}
              onClick={() => setComidaLibreUsada((v) => !v)}
            />
          </div>
          {comodinUsado && (
            <p className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              Comodín activo: el día queda en 0 pts, sin importar lo marcado abajo.
            </p>
          )}
          {!puedeActivarComidaLibre && (
            <p className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              Ya usaste tu comida libre de la semana.
            </p>
          )}

          {categorias.map(({ categoria, items }) => (
            <div key={categoria} className="card" style={{ marginBottom: 12 }}>
              <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                {categoria}
              </div>
              {items.map((r) => (
                <RuleRow
                  key={r.regla_key}
                  regla={r}
                  checked={marcadas.includes(r.regla_key)}
                  disabled={comodinUsado}
                  onToggle={() => toggleRegla(r.regla_key)}
                />
              ))}
            </div>
          ))}

          <div className="card" style={{ marginBottom: 16 }}>
            <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              Foto de evidencia (opcional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 14 }}>Neto del día</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: netoPreview < 0 ? 'var(--danger)' : 'var(--accent)' }}>
              {netoPreview > 0 ? `+${netoPreview}` : netoPreview}
            </span>
          </div>

          {guardado && (
            <p style={{ color: 'var(--accent)', fontSize: 14, textAlign: 'center' }}>Día guardado.</p>
          )}

          <button
            className="btn btn-primary btn-block"
            onClick={handleGuardar}
            disabled={saving}
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Guardando…' : 'Guardar día'}
          </button>
        </>
      )}
    </div>
  );
}

function RuleRow({ regla, checked, disabled, onToggle }) {
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 0', borderBottom: '1px solid var(--border)',
        opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} style={{ width: 18, height: 18 }} />
      <span style={{ flex: 1, fontSize: 14 }}>{regla.descripcion}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: regla.puntos > 0 ? 'var(--accent)' : 'var(--danger)' }}>
        {regla.puntos > 0 ? `+${regla.puntos}` : regla.puntos}
      </span>
    </label>
  );
}

function Toggle({ label, activo, disabled, onClick }) {
  return (
    <button
      className="btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, fontSize: 13, padding: '10px 8px',
        background: activo ? 'var(--accent)' : 'var(--surface-2)',
        borderColor: activo ? 'var(--accent)' : 'var(--border)',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}
