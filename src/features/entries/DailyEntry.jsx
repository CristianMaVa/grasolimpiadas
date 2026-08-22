import { useState, useEffect, useCallback, useMemo } from 'react';
import { listCheckableRules } from './rulesApi';
import {
  getEntryForDate, countComidaLibreEnSemana,
  registrarActividad, registrarActividades, actualizarComodin, actualizarComidaLibre, ajustarComodines,
} from './entriesApi';
import ItemRow from './ItemRow';

// ============================================================
// Registro diario. Dos modos, elegibles con un switch:
// - "Una por una" (modelo incremental, ajuste post-deploy): elegir
//   UNA actividad de un selector y registrarla — se guarda al toque.
//   Pensado para quien va reportando según pasa el día.
// - "Checklist" (ajuste post-deploy, como la versión inicial de la
//   app): marcar varias actividades a la vez y registrarlas todas
//   juntas con un solo botón. Pensado para quien prefiere marcar el
//   día completo de una sola vez.
// Ambos modos comparten las mismas reglas de validación (una regla
// máx 1 vez/día, límite por categoría, grupos exclusivos) y escriben
// en los mismos entry_items — son solo dos formas de llegar al mismo
// registro, no dos sistemas distintos. Sin evidencia fotográfica: se
// reporta por el grupo de WhatsApp y los puntos se llevan aparte en
// Excel, esta app solo emula el checklist. Editable para el día
// actual y días pasados (selector de fecha).
// ============================================================

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyEntry({ profile, onUpdateProfile, fechaInicial }) {
  const [fecha, setFecha] = useState(fechaInicial || hoyISO());
  const [reglas, setReglas] = useState([]);
  const [marcadas, setMarcadas] = useState([]);
  const [comodinUsado, setComodinUsado] = useState(false);
  const [comidaLibreUsada, setComidaLibreUsada] = useState(false);
  const [otrasComidasLibres, setOtrasComidasLibres] = useState(0);
  const [puntosNetos, setPuntosNetos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modo, setModo] = useState('individual'); // 'individual' | 'checklist'
  const [reglaSeleccionada, setReglaSeleccionada] = useState('');
  const [seleccionadosChecklist, setSeleccionadosChecklist] = useState([]);
  const [registrando, setRegistrando] = useState(false);
  const [guardandoFlag, setGuardandoFlag] = useState(null); // 'comodin' | 'comidaLibre' | null

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
    try {
      const { entry, reglaKeys } = await getEntryForDate(profile.id, fecha);
      setMarcadas(reglaKeys);
      setComodinUsado(entry?.comodin_usado ?? false);
      setComidaLibreUsada(entry?.comida_libre_usada ?? false);
      setPuntosNetos(entry?.puntos_netos ?? 0);
      setReglaSeleccionada('');
      setSeleccionadosChecklist([]);
      const otras = await countComidaLibreEnSemana(profile.id, fecha, entry?.id ?? null);
      setOtrasComidasLibres(otras);
    } catch (e) {
      setError('No se pudo cargar el día.');
    } finally {
      setLoading(false);
    }
  }, [profile.id, fecha]);

  useEffect(() => { cargarDia(); }, [cargarDia]);

  const categorias = useMemo(() => {
    const orden = [];
    const grupos = {};
    for (const r of reglas) {
      if (!grupos[r.categoria]) { grupos[r.categoria] = []; orden.push(r.categoria); }
      grupos[r.categoria].push(r);
    }
    return orden.map((categoria) => ({ categoria, items: grupos[categoria] }));
  }, [reglas]);

  const itemsRegistrados = useMemo(
    () => reglas.filter((r) => marcadas.includes(r.regla_key)),
    [reglas, marcadas]
  );

  // Cuántos items ya registrados hoy hay por categoría — para categorías
  // con límite compartido (ej. Bienestar: máx 1 entre meditar/sin pantallas).
  const conteoPorCategoria = useMemo(() => {
    const mapa = {};
    for (const r of reglas) {
      if (marcadas.includes(r.regla_key)) mapa[r.categoria] = (mapa[r.categoria] ?? 0) + 1;
    }
    return mapa;
  }, [reglas, marcadas]);

  function limiteCategoriaAlcanzado(regla) {
    if (!regla || regla.limite_categoria_dia == null) return false;
    if (marcadas.includes(regla.regla_key)) return false; // ya registrada, no es por límite
    return (conteoPorCategoria[regla.categoria] ?? 0) >= regla.limite_categoria_dia;
  }

  // Reglas "bucket" de la misma medida (agua, horas de sueño, tragos)
  // que cruzan categorías — máx 1 por día entre todas las que
  // comparten la misma etiqueta `grupo_exclusivo`. Devuelve la regla
  // ya registrada que choca con `regla`, o null si no hay conflicto.
  function grupoExclusivoConflicto(regla) {
    if (!regla || !regla.grupo_exclusivo) return null;
    if (marcadas.includes(regla.regla_key)) return null; // ya registrada, no es por el grupo
    return reglas.find((r) => (
      r.grupo_exclusivo === regla.grupo_exclusivo
      && r.regla_key !== regla.regla_key
      && marcadas.includes(r.regla_key)
    )) ?? null;
  }

  const reglaActual = reglas.find((r) => r.regla_key === reglaSeleccionada) ?? null;
  const puedeRegistrar = !!reglaActual
    && !limiteCategoriaAlcanzado(reglaActual)
    && !grupoExclusivoConflicto(reglaActual);

  // Mismas validaciones que arriba, pero mode checklist: una regla
  // cuenta como "ya cubierta" si está persistida (marcadas) O si el
  // usuario ya la marcó en el checklist sin haber guardado todavía —
  // así los checkboxes se van deshabilitando entre sí en vivo.
  const conteoPorCategoriaChecklist = useMemo(() => {
    const mapa = {};
    for (const r of reglas) {
      if (marcadas.includes(r.regla_key) || seleccionadosChecklist.includes(r.regla_key)) {
        mapa[r.categoria] = (mapa[r.categoria] ?? 0) + 1;
      }
    }
    return mapa;
  }, [reglas, marcadas, seleccionadosChecklist]);

  function limiteCategoriaAlcanzadoChecklist(regla) {
    if (!regla || regla.limite_categoria_dia == null) return false;
    if (marcadas.includes(regla.regla_key) || seleccionadosChecklist.includes(regla.regla_key)) return false;
    return (conteoPorCategoriaChecklist[regla.categoria] ?? 0) >= regla.limite_categoria_dia;
  }

  function grupoExclusivoConflictoChecklist(regla) {
    if (!regla || !regla.grupo_exclusivo) return null;
    if (marcadas.includes(regla.regla_key) || seleccionadosChecklist.includes(regla.regla_key)) return null;
    return reglas.find((r) => (
      r.grupo_exclusivo === regla.grupo_exclusivo
      && r.regla_key !== regla.regla_key
      && (marcadas.includes(r.regla_key) || seleccionadosChecklist.includes(r.regla_key))
    )) ?? null;
  }

  function handleToggleChecklistItem(reglaKey) {
    setSeleccionadosChecklist((prev) => (
      prev.includes(reglaKey) ? prev.filter((k) => k !== reglaKey) : [...prev, reglaKey]
    ));
  }

  const comodinesDisponibles = profile.comodines_restantes ?? 2;
  const puedeActivarComodin = comodinUsado || comodinesDisponibles > 0;
  const puedeActivarComidaLibre = comidaLibreUsada || otrasComidasLibres < 1;

  async function handleToggleComodin() {
    const nuevoValor = !comodinUsado;
    setGuardandoFlag('comodin');
    setError(null);
    try {
      const { puntosNetos: nuevoNeto } = await actualizarComodin(profile.id, fecha, nuevoValor);
      const delta = nuevoValor ? -1 : 1;
      const userActualizado = await ajustarComodines(profile.id, delta);
      onUpdateProfile({ comodines_restantes: userActualizado.comodines_restantes });
      setComodinUsado(nuevoValor);
      setPuntosNetos(nuevoNeto);
    } catch (e) {
      setError('No se pudo actualizar el comodín.');
    } finally {
      setGuardandoFlag(null);
    }
  }

  async function handleToggleComidaLibre() {
    const nuevoValor = !comidaLibreUsada;
    setGuardandoFlag('comidaLibre');
    setError(null);
    try {
      const { puntosNetos: nuevoNeto } = await actualizarComidaLibre(profile.id, fecha, nuevoValor);
      setComidaLibreUsada(nuevoValor);
      setPuntosNetos(nuevoNeto);
    } catch (e) {
      setError('No se pudo actualizar la comida libre.');
    } finally {
      setGuardandoFlag(null);
    }
  }

  async function handleRegistrar() {
    if (!puedeRegistrar || !reglaActual) return;
    setRegistrando(true);
    setError(null);
    try {
      const { puntosNetos: nuevoNeto } = await registrarActividad({
        userId: profile.id,
        fecha,
        regla: reglaActual,
      });
      setMarcadas((prev) => [...prev, reglaActual.regla_key]);
      setPuntosNetos(nuevoNeto);
      setReglaSeleccionada('');
    } catch (e) {
      setError('No se pudo registrar la actividad.');
    } finally {
      setRegistrando(false);
    }
  }

  async function handleRegistrarChecklist() {
    if (seleccionadosChecklist.length === 0) return;
    setRegistrando(true);
    setError(null);
    try {
      const reglasElegidas = reglas.filter((r) => seleccionadosChecklist.includes(r.regla_key));
      const { puntosNetos: nuevoNeto } = await registrarActividades({
        userId: profile.id,
        fecha,
        reglas: reglasElegidas,
      });
      setMarcadas((prev) => [...prev, ...seleccionadosChecklist]);
      setPuntosNetos(nuevoNeto);
      setSeleccionadosChecklist([]);
    } catch (e) {
      setError('No se pudieron registrar las actividades.');
    } finally {
      setRegistrando(false);
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
          <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 14 }}>Neto del día</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: puntosNetos < 0 ? 'var(--danger)' : 'var(--accent)' }}>
              {puntosNetos > 0 ? `+${puntosNetos}` : puntosNetos}
            </span>
          </div>

          <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
            <Toggle
              label={`Comodín (${comodinesDisponibles} disponible${comodinesDisponibles === 1 ? '' : 's'})`}
              activo={comodinUsado}
              disabled={!puedeActivarComodin || guardandoFlag !== null}
              onClick={handleToggleComodin}
            />
            <Toggle
              label="Comida libre"
              activo={comidaLibreUsada}
              disabled={!puedeActivarComidaLibre || guardandoFlag !== null}
              onClick={handleToggleComidaLibre}
            />
          </div>
          {comodinUsado && (
            <p className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              Comodín activo: el día queda en 0 pts, sin importar lo que registres abajo.
            </p>
          )}
          {!puedeActivarComidaLibre && (
            <p className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              Ya usaste tu comida libre de la semana.
            </p>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button
                className="btn"
                onClick={() => setModo('individual')}
                style={{
                  flex: 1, fontSize: 13, padding: '10px 8px',
                  background: modo === 'individual' ? 'var(--accent)' : 'var(--surface-2)',
                  borderColor: modo === 'individual' ? 'var(--accent)' : 'var(--border)',
                }}
              >
                Una por una
              </button>
              <button
                className="btn"
                onClick={() => setModo('checklist')}
                style={{
                  flex: 1, fontSize: 13, padding: '10px 8px',
                  background: modo === 'checklist' ? 'var(--accent)' : 'var(--surface-2)',
                  borderColor: modo === 'checklist' ? 'var(--accent)' : 'var(--border)',
                }}
              >
                Checklist
              </button>
            </div>

            {modo === 'individual' ? (
              <>
                <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                  Registrar una actividad
                </label>
                <select
                  className="input"
                  value={reglaSeleccionada}
                  onChange={(e) => setReglaSeleccionada(e.target.value)}
                  style={{ marginBottom: 10 }}
                >
                  <option value="">Elige una actividad…</option>
                  {categorias.map(({ categoria, items }) => (
                    <optgroup key={categoria} label={categoria}>
                      {items.map((r) => {
                        const yaHecha = marcadas.includes(r.regla_key);
                        const limiteAlcanzado = !yaHecha && limiteCategoriaAlcanzado(r);
                        const conflicto = !yaHecha && !limiteAlcanzado ? grupoExclusivoConflicto(r) : null;
                        const motivo = yaHecha
                          ? ' — ya registrada'
                          : limiteAlcanzado
                            ? ` — ya cumpliste el límite de ${categoria} hoy`
                            : conflicto
                              ? ` — ya elegiste "${conflicto.descripcion}" hoy`
                              : '';
                        return (
                          <option key={r.regla_key} value={r.regla_key} disabled={yaHecha || limiteAlcanzado || !!conflicto}>
                            {r.descripcion} ({r.puntos > 0 ? `+${r.puntos}` : r.puntos}){motivo}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>

                <button
                  className="btn btn-primary btn-block"
                  onClick={handleRegistrar}
                  disabled={!puedeRegistrar || registrando}
                  style={{ opacity: !puedeRegistrar || registrando ? 0.5 : 1 }}
                >
                  {registrando ? 'Registrando…' : 'Registrar'}
                </button>
              </>
            ) : (
              <>
                <p className="muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 12 }}>
                  Marca varias actividades y regístralas todas juntas.
                </p>
                {categorias.map(({ categoria, items }) => (
                  <div key={categoria} style={{ marginBottom: 14 }}>
                    <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                      {categoria}
                    </div>
                    {items.map((r) => {
                      const yaHecha = marcadas.includes(r.regla_key);
                      const marcadoAhora = seleccionadosChecklist.includes(r.regla_key);
                      const limiteAlcanzado = !yaHecha && !marcadoAhora && limiteCategoriaAlcanzadoChecklist(r);
                      const conflicto = !yaHecha && !marcadoAhora && !limiteAlcanzado ? grupoExclusivoConflictoChecklist(r) : null;
                      const disabled = yaHecha || limiteAlcanzado || !!conflicto;
                      const motivo = yaHecha
                        ? 'ya registrada'
                        : limiteAlcanzado
                          ? `ya cumpliste el límite de ${categoria} hoy`
                          : conflicto
                            ? `ya elegiste "${conflicto.descripcion}" hoy`
                            : null;
                      return (
                        <label
                          key={r.regla_key}
                          style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', opacity: disabled ? 0.5 : 1 }}
                        >
                          <input
                            type="checkbox"
                            checked={yaHecha || marcadoAhora}
                            disabled={disabled}
                            onChange={() => handleToggleChecklistItem(r.regla_key)}
                            style={{ marginTop: 3 }}
                          />
                          <span style={{ fontSize: 14, flex: 1 }}>
                            {r.descripcion} ({r.puntos > 0 ? `+${r.puntos}` : r.puntos})
                            {motivo && <span className="muted" style={{ fontSize: 12 }}> — {motivo}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))}

                <button
                  className="btn btn-primary btn-block"
                  onClick={handleRegistrarChecklist}
                  disabled={seleccionadosChecklist.length === 0 || registrando}
                  style={{ opacity: seleccionadosChecklist.length === 0 || registrando ? 0.5 : 1 }}
                >
                  {registrando
                    ? 'Registrando…'
                    : `Registrar seleccionadas${seleccionadosChecklist.length > 0 ? ` (${seleccionadosChecklist.length})` : ''}`}
                </button>
              </>
            )}
          </div>

          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Ya registraste hoy · {itemsRegistrados.length}
          </div>

          {itemsRegistrados.length === 0 && (
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="muted" style={{ margin: 0 }}>Nada registrado todavía este día.</p>
            </div>
          )}

          {itemsRegistrados.map((item) => (
            <ItemRow key={item.regla_key} descripcion={item.descripcion} puntos={item.puntos} />
          ))}
        </>
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
