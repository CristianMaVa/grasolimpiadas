// ============================================================
// Motor de puntos (Fase 2, ver HANDOFF §7).
// Función pura: dada la lista de items marcados de un día,
// devuelve el neto. No conoce Supabase ni React.
// ============================================================

// Comida libre: exime del cómputo las restas de "Alimentación" marcadas
// ese día (decisión de UX tomada aquí — §7 la dejaba abierta). El item
// queda registrado en entry_items para el historial, pero no penaliza.
export function calcularNeto(items, { comodinUsado = false, comidaLibreUsada = false } = {}) {
  if (comodinUsado) return 0;

  const efectivos = comidaLibreUsada
    ? items.filter((i) => !(i.categoria === 'Alimentación' && i.puntos < 0))
    : items;

  const positivos = efectivos.filter((i) => i.puntos > 0).reduce((s, i) => s + i.puntos, 0);
  const negativos = efectivos.filter((i) => i.puntos < 0).reduce((s, i) => s + i.puntos, 0);

  const positivosCap = Math.min(positivos, 15); // cap solo a positivos
  return positivosCap + negativos; // negativos es ≤ 0, sin piso
}
