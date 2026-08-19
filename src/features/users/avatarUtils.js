// Iniciales a partir del nombre (máx 2 letras)
export function initials(nombre) {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Color estable derivado del nombre (para el círculo del avatar)
const PALETTE = [
  '#d8442c', '#1d9e75', '#378add', '#7f77dd',
  '#ba7517', '#d4537e', '#639922', '#0f6e56',
];

export function avatarColor(nombre) {
  if (!nombre) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
