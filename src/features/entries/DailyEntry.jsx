import { useState, useEffect, useCallback, useMemo } from 'react';
import { listCheckableRules } from './rulesApi';
import { getEntryForDate, countComidaLibreEnSemana, saveDailyEntry, ajustarComodines } from './entriesApi';
import { calcularNeto } from './pointsEngine';

// ============================================================
// Registro diario (Fase 2, ajustado luego del deploy).
// Checklist agrupado por categoría + comodín (retroactivo,
// deja el día en 0) + comida libre (1/semana, sin penalizar).
// Evidencia fotográfica: obligatoria (mín. 1 foto) para todo
// item de tipo "suma"; las restas (incluye Penalidades) no la
// piden. Sin foto en un item de suma marcado, no se puede
// guardar el día. Editable para el día actual y días pasados.
// ============================================================

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyEntry({ profile, onUpdateProfile, fechaInicial }) {
  const [fecha, setFecha] = useState(fechaInicial || hoyISO());
  const [reglas, setReglas] = useState([]);
  const [marcadas, setMarcadas] = useState([]);
  const [comodinUsado, setComodinUsado] = useState(false);
  const [comodinOriginal, setComodinOriginal] = useState(false);
  const [comidaLibreUsada, setComidaLibreUsada] = useState(false);
  const [otrasComidasLibres, setOtrasComidasLibres] = useState(0);
  const [evidenciaExistente, setEvidenciaExistente] = useState({}); // { regla_key: [{id, foto_url}] }
  const [fotosNuevas, setFotosNuevas] = useState({}); // { regla_key: File[] }
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
      const { entry, reglaKeys, evidenciaPorRegla } = await getEntryForDate(profile.id, fecha);
      setMarcadas(reglaKeys);
      setEvidenciaExistente(evidenciaPorRegla ?? {});
      setFotosNuevas({});
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

  // `files` debe ser un array ya "congelado" (no la FileList viva del
  // input) — el caller limpia el input justo después de llamar esto,
  // lo que vacía la FileList original si la seguimos referenciando.
  function agregarFotos(reglaKey, files) {
    if (!files || files.length === 0) return;
    setFotosNuevas((prev) => ({ ...prev, [reglaKey]: [...(prev[reglaKey] ?? []), ...files] }));
  }

  function quitarFotoNueva(reglaKey, index) {
    setFotosNuevas((prev) => ({ ...prev, [reglaKey]: prev[reglaKey].filter((_, i) => i !== index) }));
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

  const itemsSinEvidencia = useMemo(
    () => itemsMarcados.filter((r) => {
      if (r.tipo !== 'suma') return false;
      const existentes = evidenciaExistente[r.regla_key]?.length ?? 0;
      const nuevas = fotosNuevas[r.regla_key]?.length ?? 0;
      return existentes + nuevas < 1;
    }),
    [itemsMarcados, evidenciaExistente, fotosNuevas]
  );

  const comodinesDisponibles = profile.comodines_restantes ?? 2;
  const puedeActivarComodin = comodinUsado || comodinesDisponibles > 0;
  const puedeActivarComidaLibre = comidaLibreUsada || otrasComidasLibres < 1;

  async function handleGuardar() {
    if (itemsSinEvidencia.length > 0) {
      setError(`Falta foto para: ${itemsSinEvidencia.map((r) => r.descripcion).join(', ')}.`);
      return;
    }

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
        fotosPorRegla: fotosNuevas,
      });

      if (comodinUsado !== comodinOriginal) {
        const delta = comodinUsado ? -1 : 1;
        const userActualizado = await ajustarComodines(profile.id, delta);
        onUpdateProfile({ comodines_restantes: userActualizado.comodines_restantes });
        setComodinOriginal(comodinUsado);
      }

      await cargarDia();
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
                  fotosExistentes={evidenciaExistente[r.regla_key] ?? []}
                  fotosNuevas={fotosNuevas[r.regla_key] ?? []}
                  onAgregarFotos={(files) => agregarFotos(r.regla_key, files)}
                  onQuitarFotoNueva={(i) => quitarFotoNueva(r.regla_key, i)}
                />
              ))}
            </div>
          ))}

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

function RuleRow({
  regla, checked, disabled, onToggle,
  fotosExistentes, fotosNuevas, onAgregarFotos, onQuitarFotoNueva,
}) {
  const requiereEvidencia = regla.tipo === 'suma';
  const totalFotos = fotosExistentes.length + fotosNuevas.length;

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', opacity: disabled ? 0.5 : 1 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: disabled ? 'default' : 'pointer' }}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} style={{ width: 18, height: 18 }} />
        <span style={{ flex: 1, fontSize: 14 }}>{regla.descripcion}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: regla.puntos > 0 ? 'var(--accent)' : 'var(--danger)' }}>
          {regla.puntos > 0 ? `+${regla.puntos}` : regla.puntos}
        </span>
      </label>

      {checked && requiereEvidencia && !disabled && (
        <div style={{ marginTop: 8, marginLeft: 28 }}>
          <label
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '6px 10px', display: 'inline-flex' }}
          >
            📷 Agregar foto
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => { onAgregarFotos(Array.from(e.target.files)); e.target.value = ''; }}
            />
          </label>

          <span
            className="muted"
            style={{ fontSize: 12, marginLeft: 8, color: totalFotos === 0 ? 'var(--danger)' : undefined }}
          >
            {totalFotos === 0
              ? 'Falta foto'
              : `${totalFotos} foto${totalFotos === 1 ? '' : 's'}`}
          </span>

          {fotosNuevas.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {fotosNuevas.map((f, i) => (
                <span key={i} className="muted" style={{ fontSize: 11, background: 'var(--surface-2)', borderRadius: 8, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {f.name.length > 16 ? `${f.name.slice(0, 13)}…` : f.name}
                  <button
                    onClick={() => onQuitarFotoNueva(i)}
                    style={{ color: 'var(--danger)', fontWeight: 700, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
