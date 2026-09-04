// ============================================================
// Motor de puntos (Fase 2, ver HANDOFF §7).
// Funciones puras: dada la lista de items marcados de un día,
// devuelven el neto. No conocen Supabase ni React.
// ============================================================

// Comida libre: exime del cómputo las restas de "Alimentación" marcadas
// ese día (decisión de UX tomada aquí — §7 la dejaba abierta). El item
// queda registrado en entry_items para el historial, pero no penaliza.
// Comodín (revisado — ver supabase/20_comodin_por_actividad.sql): ya no
// es un flag de día completo, sino por item (`comodin_aplicado`). Un
// item marcado así queda excluido de la suma, sin importar su signo —
// sigue registrado en entry_items para el historial (con sus puntos
// originales intactos), pero no se computa.
function separarPuntos(items, comidaLibreUsada) {
  const efectivos = items.filter((i) => {
    if (i.comodin_aplicado) return false;
    if (comidaLibreUsada && i.categoria === 'Alimentación' && i.puntos < 0) return false;
    return true;
  });

  const positivos = efectivos.filter((i) => i.puntos > 0).reduce((s, i) => s + i.puntos, 0);
  const negativos = efectivos.filter((i) => i.puntos < 0).reduce((s, i) => s + i.puntos, 0);
  return { positivos, negativos };
}

// Neto real del día: cap de +15 al NETO (positivos + negativos), sin
// piso hacia abajo. Antes el cap se aplicaba solo a los positivos
// ANTES de restar (min(positivos,15) + negativos), lo cual subestimaba
// el neto en días con positivos > 15 y alguna resta — ej. +17/-1 daba
// 14 en vez de 15. Corregido: se suman positivos y negativos primero
// (ya lo hace calcularNetoSinLimite) y el cap se aplica al resultado.
export function calcularNeto(items, { comidaLibreUsada = false } = {}) {
  const { positivos, negativos } = separarPuntos(items, comidaLibreUsada);
  return Math.min(positivos + negativos, 15);
}

// Igual que calcularNeto pero SIN el cap de +15/día — se usa únicamente
// para desempatar el ranking cuando el neto real (con cap) da igual
// entre dos jugadores (ver v_ranking).
export function calcularNetoSinLimite(items, { comidaLibreUsada = false } = {}) {
  const { positivos, negativos } = separarPuntos(items, comidaLibreUsada);
  return positivos + negativos;
}
