// ============================================================
// Motor de puntos (Fase 2, ver HANDOFF §7).
// Funciones puras: dada la lista de items marcados de un día,
// devuelven el neto. No conocen Supabase ni React.
// ============================================================

// Comida libre: exime del cómputo las restas de "Alimentación" marcadas
// ese día (decisión de UX tomada aquí — §7 la dejaba abierta). El item
// queda registrado en entry_items para el historial, pero no penaliza.
function separarPuntos(items, comidaLibreUsada) {
  const efectivos = comidaLibreUsada
    ? items.filter((i) => !(i.categoria === 'Alimentación' && i.puntos < 0))
    : items;

  const positivos = efectivos.filter((i) => i.puntos > 0).reduce((s, i) => s + i.puntos, 0);
  const negativos = efectivos.filter((i) => i.puntos < 0).reduce((s, i) => s + i.puntos, 0);
  return { positivos, negativos };
}

// Neto real del día: cap de +15 a los positivos, negativos sin piso.
export function calcularNeto(items, { comodinUsado = false, comidaLibreUsada = false } = {}) {
  if (comodinUsado) return 0;
  const { positivos, negativos } = separarPuntos(items, comidaLibreUsada);
  return Math.min(positivos, 15) + negativos; // cap solo a positivos
}

// Igual que calcularNeto pero SIN el cap de +15/día — se usa únicamente
// para desempatar el ranking cuando el neto real (con cap) da igual
// entre dos jugadores (ver v_ranking).
export function calcularNetoSinLimite(items, { comodinUsado = false, comidaLibreUsada = false } = {}) {
  if (comodinUsado) return 0;
  const { positivos, negativos } = separarPuntos(items, comidaLibreUsada);
  return positivos + negativos;
}
