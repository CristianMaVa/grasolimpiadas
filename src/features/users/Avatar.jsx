import { initials, avatarColor } from './avatarUtils';

// ============================================================
// Avatar de un participante: foto real si `avatar_url` está
// seteado, si no el círculo de iniciales de siempre.
// ============================================================

export default function Avatar({ user, size = 32 }) {
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.nombre}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
        }}
      />
    );
  }

  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarColor(user?.nombre), color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: Math.round(size * 0.4), flexShrink: 0,
    }}>
      {initials(user?.nombre)}
    </span>
  );
}
